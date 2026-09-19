import { Hono, type Context } from "hono";
import { FOUNDING_CUSTOMER_LIMIT } from "./ai-employee-catalog.js";
import type { AnswerInterpreter } from "./answer-interpreter.js";
import type { DiagnosticInput } from "./diagnostic-engine.js";
import { extractStatedMonthlyBudgetUsd } from "./diagnostic-engine.js";
import type { VoiceSynthesizer } from "./elevenlabs-voice.js";
import { requestPreliminaryFlightPlan, restoreNovaDiscovery, startNovaDiscovery, submitNovaDiscoveryAnswer, type NovaDiscoveryResponse } from "./discovery-api-contract.js";
import { InMemoryDiscoveryStateRepository, type DiscoveryStateRepository } from "./discovery-state-repository.js";
import { appendConversationExchange, isClearYes, isFlightPlanRequest, isReadyToSaveSignal, isSaveCancelSignal, type DiscoverySessionState, type PendingConversationalSave } from "./discovery-session.js";
import { getDiscoveryQuestions, resolveQuestionPrompt } from "./discovery-graph.js";
import { isHumanHandoffRequest, SessionGroundedNovaConversationEngine, type NovaConversationEngine, type NovaConversationTurn } from "./dynamic-conversation-engine.js";
import { handoffFlightPlanToGhl, handoffHumanRequestToGhl, type ProductionGhlContactIdentity, type ProductionGhlHandoffConfig, type ProductionGhlHandoffResult } from "./ghl-production-handoff.js";
import { toImmersiveNovaView } from "./higgsfield-ui-adapter.js";
import { completedJourney, journeyForProgress } from "./nova-sales-journey.js";
import type { PostgresLaunchPlanRepository } from "./postgres-launch-plan-repository.js";
import type { StripeClient } from "./stripe-client.js";

export interface StripeCheckoutConfig {
  enabled: boolean;
  client: StripeClient;
  foundingSetupPriceId: string;
  standardSetupPriceId: string;
  monthlyPriceId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface DiscoveryRouterOptions {
  productionGhl?: ProductionGhlHandoffConfig;
  conversationEngine?: NovaConversationEngine;
  answerInterpreter?: AnswerInterpreter;
  voiceSynthesizer?: VoiceSynthesizer;
  stripe?: StripeCheckoutConfig;
  launchPlanRepository?: PostgresLaunchPlanRepository;
}

/**
 * Synthesizes audio for a turn only when the visitor actually spoke to Nova
 * (voiceInput on the request) and voice is configured - never for typed
 * turns, to keep cost and behavior predictable. A synthesis failure (bad
 * key, ElevenLabs outage, timeout) must never fail the turn itself - the
 * text reply always ships; audio is a pure bonus.
 */
async function withVoice(turn: NovaConversationTurn, voiceInput: boolean, voice?: VoiceSynthesizer): Promise<NovaConversationTurn> {
  if (!voiceInput || !voice) return turn;
  try {
    const audio = await voice.synthesize(turn.answer);
    return { ...turn, audio };
  } catch (error) {
    console.warn("[nova-voice] synthesis failed, continuing text-only:", error instanceof Error ? error.message : error);
    return turn;
  }
}

/**
 * Live founding-slot availability, shared by /start (which freezes the
 * result onto the session for the life of the conversation - see
 * DiscoverySessionState.foundingCustomerEligible) and create-checkout-session
 * (which re-checks fresh at charge time so the $0 price can never be
 * oversold past FOUNDING_CUSTOMER_LIMIT). Defaults to not-eligible when the
 * repository isn't configured, matching this codebase's "never invent a
 * discount" default.
 */
async function foundingSlotsAvailable(launchPlanRepository?: PostgresLaunchPlanRepository): Promise<boolean> {
  if (!launchPlanRepository) return false;
  const foundingCount = await launchPlanRepository.countFoundingSignups();
  return foundingCount < FOUNDING_CUSTOMER_LIMIT;
}

function answeredCount(state: DiscoverySessionState): number {
  return Object.keys(state.answers).filter((key) => key !== "path").length;
}

function responseWithView(state: DiscoverySessionState) {
  const response = restoreNovaDiscovery(state);
  const view = toImmersiveNovaView(response);
  const journey = response.completed && response.result ? completedJourney(response.result.flightPlan) : journeyForProgress(view.progressPercent, false);
  return { response, view, journey };
}

function handoffPrompt(requestText: string) {
  return { status: "contact_required" as const, requestText, message: "Nova paused discovery. Add your contact details and Moonrock can continue from what you've already shared." };
}

/**
 * What actually happens next differs by offer: some are zero-touch (Nova can
 * finish setup herself once details are locked in), others need at least one
 * human touch - and even then, only promise a rep will reach out if the
 * visitor actually consented to follow-up (the optional checkbox on the save
 * form; the chat-based save flow never asks, so it correctly stays false).
 */
export function flightPlanSaveAnswer(result: ProductionGhlHandoffResult): string {
  if (result.status !== "confirmed") return "Your Flight Plan details are ready, but live CRM writes are currently disabled.";
  if (result.autonomousCloseAllowed) return "Your Flight Plan is saved with Moonrock. This option can be set up without extra steps - just let Nova know here in chat whenever you're ready to move forward.";
  if (result.followUpEnabled) return "Your Flight Plan is saved with Moonrock. Since this option includes a quick setup step, a Moonrock rep will reach out by email or phone shortly to go over the details.";
  return "Your Flight Plan is saved with Moonrock. This option includes a short review by our team before setup - feel free to reach out directly anytime, or keep talking with Nova here.";
}

function completionAnswerForTier(response: NovaDiscoveryResponse): string {
  if (response.websiteBuildResult) {
    return `I have enough to put together a starting brief. Here's the preliminary direction for ${response.websiteBuildResult.brief.offerName}; anything still unknown is an assumption we can confirm before build work begins.`;
  }
  if (response.ghlSaasResult) {
    return "I have enough to give you a starting recommendation for your white-label setup; anything still unknown is an assumption we can confirm before provisioning.";
  }
  return "I have enough to give you a useful starting direction. Here's your Preliminary Flight Plan; anything still unknown is an assumption we can fine-tune after you see the recommendation.";
}

function extractEmailAddress(text: string): string | undefined {
  return text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0];
}

/** Best-effort split of a freely-typed name into firstName/lastName - good enough for a conversational shortcut, not a replacement for the real form's separate fields. */
function splitName(text: string): { firstName: string; lastName?: string } {
  const cleaned = text.trim().replace(/^(i'?m|it'?s|this is|my name is|name'?s)\s+/i, "").trim();
  const [first, ...rest] = cleaned.split(/\s+/).filter(Boolean);
  return { firstName: first || cleaned, ...(rest.length ? { lastName: rest.join(" ") } : {}) };
}

/** Builds the next turn's response, persists it, and returns the Response - the shared shape every /conversation branch below returns. */
async function respondAndPersist(
  context: Context,
  repository: DiscoveryStateRepository,
  sessionId: string,
  expectedVersion: number,
  nextState: DiscoverySessionState,
  question: string,
  answer: string,
  voiceInput = false,
  voice?: VoiceSynthesizer,
): Promise<Response> {
  const conversationTurn = await withVoice({ answer, mode: "grounded_fallback", intent: "pause_discovery" }, voiceInput, voice);
  const state = appendConversationExchange(nextState, question, answer);
  try { await repository.save(sessionId, state, expectedVersion); } catch { return context.json({ code: "DISCOVERY_VERSION_CONFLICT" }, 409); }
  const currentView = responseWithView(state);
  return context.json({ ...currentView.response, conversationTurn, journey: currentView.journey, view: currentView.view });
}

/**
 * Advances an in-progress conversational Flight Plan save (see
 * PendingConversationalSave in discovery-session.ts). Deliberately collects
 * only name/email/one explicit yes - no phone/SMS opt-in, which stays on the
 * real Save Flight Plan form only. Calls the exact same handoffFlightPlanToGhl
 * the form's /save-flight-plan route uses once consent is given.
 */
async function handlePendingSave(
  context: Context,
  repository: DiscoveryStateRepository,
  sessionId: string,
  current: { state: DiscoverySessionState; version: number },
  question: string,
  productionGhl: ProductionGhlHandoffConfig | undefined,
  voiceInput = false,
  voice?: VoiceSynthesizer,
): Promise<Response> {
  const pending = current.state.pendingSave as PendingConversationalSave;
  const { pendingSave: _drop, ...withoutPendingSave } = current.state;

  const decline = (message: string) => respondAndPersist(context, repository, sessionId, current.version, withoutPendingSave, question, message, voiceInput, voice);

  if (!productionGhl) return decline("Sorry, saving isn't available right now - nothing was lost. You're still welcome to keep talking.");
  if (isHumanHandoffRequest(question) || isSaveCancelSignal(question)) return decline("No problem, I won't save anything. Say the word whenever you're ready.");

  if (pending.stage === "awaiting_name") {
    const { firstName, lastName } = splitName(question);
    const nextPending: PendingConversationalSave = { stage: "awaiting_email", firstName, ...(lastName ? { lastName } : {}) };
    const answer = `Thanks${firstName ? `, ${firstName}` : ""} - what's the best email to save this with?`;
    return respondAndPersist(context, repository, sessionId, current.version, { ...current.state, pendingSave: nextPending }, question, answer, voiceInput, voice);
  }

  if (pending.stage === "awaiting_email") {
    const email = extractEmailAddress(question);
    if (!email) return respondAndPersist(context, repository, sessionId, current.version, current.state, question, "I didn't catch a valid email in that - what's the best email to save this with?", voiceInput, voice);
    const nextPending: PendingConversationalSave = { ...pending, email, stage: "awaiting_consent" };
    const answer = `Got it - ${email}. Reply YES and I'll save your Flight Plan and this inquiry with Moonrock using that email, or say no and I won't.`;
    return respondAndPersist(context, repository, sessionId, current.version, { ...current.state, pendingSave: nextPending }, question, answer, voiceInput, voice);
  }

  // pending.stage === "awaiting_consent"
  if (!isClearYes(question)) return decline("No problem, I won't save anything. Say the word whenever you're ready.");
  const restored = restoreNovaDiscovery(current.state);
  if (!restored.result) return decline("I lost track of the Flight Plan details for that - you can also use the Save Flight Plan form on the page instead.");
  const identity: ProductionGhlContactIdentity = { email: pending.email as string, ...(pending.firstName ? { firstName: pending.firstName } : {}), ...(pending.lastName ? { lastName: pending.lastName } : {}) };
  try {
    const ascension = typeof current.state.ascensionScore === "number"
      ? { ascensionScore: current.state.ascensionScore, currentTier: current.state.currentTier ?? null, ...(current.state.lastEngagementAt ? { lastEngagementAt: current.state.lastEngagementAt } : {}) }
      : undefined;
    const result = await handoffFlightPlanToGhl({ sessionId, identity, diagnosticInput: current.state.answers as DiagnosticInput, diagnostic: restored.result.diagnostic, flightPlan: restored.result.flightPlan, ...(ascension ? { ascension } : {}), ...(current.state.conversationHistory ? { conversationHistory: current.state.conversationHistory } : {}) }, productionGhl, { apply: productionGhl.enabled && productionGhl.fieldsVerified && productionGhl.writesEnabled });
    const answer = flightPlanSaveAnswer(result);
    return respondAndPersist(context, repository, sessionId, current.version, withoutPendingSave, question, answer, voiceInput, voice);
  } catch (error) {
    console.error(`[conversation-save] failed for session ${sessionId}:`, error instanceof Error ? error.stack ?? error.message : error);
    return decline("I couldn't save that just now - you can also use the Save Flight Plan form on the page instead.");
  }
}

export function createDiscoveryRouter(repository: DiscoveryStateRepository = new InMemoryDiscoveryStateRepository(), options: DiscoveryRouterOptions = {}): Hono {
  const router = new Hono();
  const conversationEngine = options.conversationEngine ?? new SessionGroundedNovaConversationEngine();

  router.post("/:sessionId/start", async (context) => {
    const sessionId = context.req.param("sessionId");
    const body = await context.req.json() as { path?: unknown; visitorId?: unknown; conversationId?: unknown; previousConversationSummary?: unknown };
    if (body.path !== "startup" && body.path !== "existing_business") return context.json({ code: "INVALID_DISCOVERY_PATH" }, 400);
    const visitorId = typeof body.visitorId === "string" && body.visitorId.trim() ? body.visitorId.trim() : `anonymous-${sessionId}`;
    const conversationId = typeof body.conversationId === "string" && body.conversationId.trim() ? body.conversationId.trim() : sessionId;
    const previousConversationSummary = typeof body.previousConversationSummary === "string" && body.previousConversationSummary.trim() ? body.previousConversationSummary.trim() : undefined;
    const foundingCustomerEligible = await foundingSlotsAvailable(options.launchPlanRepository);
    const result = startNovaDiscovery(body.path, { visitorId, conversationId, ...(previousConversationSummary ? { previousConversationSummary } : {}) }, foundingCustomerEligible);
    const openingText = body.path === "startup" ? "I'm starting something." : "My business needs to grow.";
    const variantIndex = result.state.questionVariantIndex ?? 0;
    const openingQuestion = getDiscoveryQuestions(body.path, {}).find((q) => q.field === "ownerName");
    const openingNextNeed = openingQuestion ? { nextNeed: { field: "ownerName", prompt: resolveQuestionPrompt(openingQuestion, variantIndex) } } : {};
    const conversationTurn = await conversationEngine.respond(result.state, openingText, { opening: true, progressPercent: 0, ...openingNextNeed });
    const state = appendConversationExchange(result.state, openingText, conversationTurn.answer);
    try { await repository.create(sessionId, state); } catch { return context.json({ code: "DISCOVERY_ALREADY_EXISTS" }, 409); }
    return context.json({ ...result.response, conversationTurn, journey: journeyForProgress(0, false), view: toImmersiveNovaView(result.response) }, 201);
  });

  router.post("/:sessionId/answers", async (context) => {
    const sessionId = context.req.param("sessionId");
    const current = await repository.load(sessionId);
    if (!current) return context.json({ code: "DISCOVERY_NOT_FOUND" }, 404);
    if (current.state.completed) return context.json({ code: "DISCOVERY_COMPLETE" }, 409);
    const body = await context.req.json() as { field?: unknown; value?: unknown; identity?: ProductionGhlContactIdentity; voiceInput?: unknown };
    if (typeof body.field !== "string" || !("value" in body)) return context.json({ code: "INVALID_DISCOVERY_ANSWER" }, 400);
    const rawCustomerText = typeof body.value === "string" ? body.value : String(body.value);
    const voiceInput = body.voiceInput === true;

    if (isHumanHandoffRequest(rawCustomerText)) {
      const currentView = responseWithView(current.state);
      const conversationTurn = await withVoice(await conversationEngine.respond(current.state, rawCustomerText, { progressPercent: currentView.view.progressPercent }), voiceInput, options.voiceSynthesizer);
      const state = appendConversationExchange(current.state, rawCustomerText, conversationTurn.answer);
      try { await repository.save(sessionId, state, current.version); } catch { return context.json({ code: "DISCOVERY_VERSION_CONFLICT" }, 409); }
      return context.json({ ...currentView.response, conversationTurn, humanHandoff: handoffPrompt(rawCustomerText), journey: currentView.journey, view: { ...currentView.view, visualState: "handoff" } });
    }

    const result = isFlightPlanRequest(rawCustomerText)
      ? requestPreliminaryFlightPlan(current.state)
      : await submitNovaDiscoveryAnswer(current.state, body.field as keyof DiagnosticInput, body.value, options.answerInterpreter);
    const view = toImmersiveNovaView(result.response);
    const journey = result.response.completed && result.response.result ? completedJourney(result.response.result.flightPlan) : journeyForProgress(view.progressPercent, false);
    const conversationTurn = await withVoice(
      result.response.clarification
        ? { answer: result.response.clarification.message, mode: "grounded_fallback", intent: "pause_discovery" }
        : result.response.completed
          ? { answer: completionAnswerForTier(result.response), mode: "grounded_fallback", intent: "pause_discovery" }
          : await conversationEngine.respond(result.state, rawCustomerText, { progressPercent: view.progressPercent, ...(result.response.nextQuestion ? { nextNeed: { field: String(result.response.nextQuestion.field), prompt: result.response.nextQuestion.prompt } } : {}) }),
      voiceInput,
      options.voiceSynthesizer,
    );
    const state = appendConversationExchange(result.state, rawCustomerText, conversationTurn.answer);
    try { await repository.save(sessionId, state, current.version); } catch { return context.json({ code: "DISCOVERY_VERSION_CONFLICT" }, 409); }
    return context.json({ ...result.response, conversationTurn, journey, view });
  });

  router.post("/:sessionId/conversation", async (context) => {
    const sessionId = context.req.param("sessionId");
    const current = await repository.load(sessionId);
    if (!current) return context.json({ code: "DISCOVERY_NOT_FOUND" }, 404);
    const body = await context.req.json() as { question?: unknown; voiceInput?: unknown };
    if (typeof body.question !== "string" || !body.question.trim()) return context.json({ code: "INVALID_NOVA_QUESTION" }, 400);
    const question = body.question.trim();
    const voiceInput = body.voiceInput === true;

    if (current.state.pendingSave) {
      return handlePendingSave(context, repository, sessionId, current, question, options.productionGhl, voiceInput, options.voiceSynthesizer);
    }

    if (!current.state.completed && isFlightPlanRequest(question)) {
      const result = requestPreliminaryFlightPlan(current.state);
      const answer = `Absolutely. I'm stopping discovery here. ${completionAnswerForTier(result.response)}`;
      const conversationTurn = await withVoice({ answer, mode: "grounded_fallback", intent: "pause_discovery" }, voiceInput, options.voiceSynthesizer);
      const state = appendConversationExchange(result.state, question, answer);
      try { await repository.save(sessionId, state, current.version); } catch { return context.json({ code: "DISCOVERY_VERSION_CONFLICT" }, 409); }
      const view = toImmersiveNovaView(result.response);
      return context.json({ answer, mode: conversationTurn.mode, intent: conversationTurn.intent, ...result.response, conversationTurn, journey: result.response.result ? completedJourney(result.response.result.flightPlan) : journeyForProgress(100, true), view });
    }

    if (current.state.completed && (current.state.tier ?? "ai_employee") === "ai_employee") {
      const statedBudget = extractStatedMonthlyBudgetUsd(question);
      if (statedBudget !== undefined && statedBudget > 0) {
        const nextState = { ...current.state, answers: { ...current.state.answers, budgetCeilingMonthlyUsd: statedBudget } };
        const response = restoreNovaDiscovery(nextState);
        const plan = response.result?.flightPlan;
        const answer = plan
          ? plan.recommendation.monthlyFeeUsd <= statedBudget
            ? `Got it — here's a better fit for a $${statedBudget}/month budget: ${plan.recommendation.offerName} at $${plan.recommendation.monthlyFeeUsd}/month plus $${plan.recommendation.setupFeeUsd} setup. ${plan.recommendation.reason}`
            : `I hear you on budget. Even Moonrock's most affordable AI Employee option, ${plan.recommendation.offerName}, runs $${plan.recommendation.monthlyFeeUsd}/month plus $${plan.recommendation.setupFeeUsd} setup — that's the published catalog floor, so I won't invent a discount below it. Want to look at a one-time Website Build instead, or talk to a person about options?`
          : "I heard your budget, but I don't have enough locked down yet to reprice this.";
        const conversationTurn = await withVoice({ answer, mode: "grounded_fallback", intent: "pause_discovery" }, voiceInput, options.voiceSynthesizer);
        const state = appendConversationExchange(nextState, question, answer);
        try { await repository.save(sessionId, state, current.version); } catch { return context.json({ code: "DISCOVERY_VERSION_CONFLICT" }, 409); }
        const view = toImmersiveNovaView(response);
        const journey = response.result ? completedJourney(response.result.flightPlan) : journeyForProgress(100, true);
        return context.json({ ...response, conversationTurn, journey, view });
      }
    }

    if (current.state.completed && options.productionGhl && isReadyToSaveSignal(question)) {
      const nextPending: PendingConversationalSave = { stage: "awaiting_name" };
      const answer = "I can save this for you right now, right here in chat - what name should I put on it?";
      return respondAndPersist(context, repository, sessionId, current.version, { ...current.state, pendingSave: nextPending }, question, answer, voiceInput, options.voiceSynthesizer);
    }

    const currentView = responseWithView(current.state);
    try {
      const turn = await withVoice(await conversationEngine.respond(current.state, question, { progressPercent: currentView.view.progressPercent }), voiceInput, options.voiceSynthesizer);
      const state = appendConversationExchange(current.state, question, turn.answer);
      try { await repository.save(sessionId, state, current.version); } catch { return context.json({ code: "DISCOVERY_VERSION_CONFLICT" }, 409); }
      return context.json({ ...turn, progress: currentView.response.progress, completed: current.state.completed, view: currentView.view, ...(turn.intent === "human_handoff" ? { humanHandoff: handoffPrompt(question) } : {}) });
    } catch (error) {
      return context.json({ code: "NOVA_CONVERSATION_UNAVAILABLE", detail: error instanceof Error ? error.message : "Nova could not answer that question right now." }, 503);
    }
  });

  router.post("/:sessionId/save-flight-plan", async (context) => {
    const sessionId = context.req.param("sessionId");
    const current = await repository.load(sessionId);
    if (!current) return context.json({ code: "DISCOVERY_NOT_FOUND" }, 404);
    if (!current.state.completed) return context.json({ code: "FLIGHT_PLAN_NOT_READY", detail: "Build the Preliminary Flight Plan before saving a copy." }, 409);
    const body = await context.req.json() as { identity?: ProductionGhlContactIdentity };
    if (!body.identity?.email?.trim()) return context.json({ code: "FLIGHT_PLAN_CONTACT_REQUIRED", detail: "A valid email is required to save and send the Flight Plan." }, 400);
    if (!options.productionGhl) return context.json({ code: "FLIGHT_PLAN_SAVE_UNAVAILABLE", detail: "Moonrock's CRM connection is not configured right now." }, 503);
    const restored = restoreNovaDiscovery(current.state);
    if (!restored.result) return context.json({ code: "FLIGHT_PLAN_NOT_READY" }, 409);
    try {
      const ascension = typeof current.state.ascensionScore === "number"
        ? { ascensionScore: current.state.ascensionScore, currentTier: current.state.currentTier ?? null, ...(current.state.lastEngagementAt ? { lastEngagementAt: current.state.lastEngagementAt } : {}) }
        : undefined;
      const result = await handoffFlightPlanToGhl({ sessionId, identity: body.identity, diagnosticInput: current.state.answers as DiagnosticInput, diagnostic: restored.result.diagnostic, flightPlan: restored.result.flightPlan, ...(ascension ? { ascension } : {}), ...(current.state.conversationHistory ? { conversationHistory: current.state.conversationHistory } : {}) }, options.productionGhl, { apply: options.productionGhl.enabled && options.productionGhl.fieldsVerified && options.productionGhl.writesEnabled });
      return context.json({ status: result.status, answer: flightPlanSaveAnswer(result) });
    } catch (error) {
      console.error(`[save-flight-plan] failed for session ${sessionId}:`, error instanceof Error ? error.stack ?? error.message : error);
      return context.json({ code: "FLIGHT_PLAN_SAVE_FAILED", detail: error instanceof Error ? error.message : "Moonrock could not save the Flight Plan right now." }, 503);
    }
  });

  router.post("/:sessionId/create-checkout-session", async (context) => {
    const sessionId = context.req.param("sessionId");
    const current = await repository.load(sessionId);
    if (!current) return context.json({ code: "DISCOVERY_NOT_FOUND" }, 404);
    if (!current.state.completed) return context.json({ code: "FLIGHT_PLAN_NOT_READY", detail: "Build the Preliminary Flight Plan before checking out." }, 409);
    if (!options.stripe?.enabled) return context.json({ code: "CHECKOUT_UNAVAILABLE", detail: "Payment is not configured right now." }, 503);
    const restored = restoreNovaDiscovery(current.state);
    const recommendation = restored.result?.flightPlan.recommendation;
    if (!recommendation || recommendation.offerId !== "moonrock_launch_plan" || !recommendation.autonomousCloseAllowed) {
      return context.json({ code: "CHECKOUT_NOT_ELIGIBLE", detail: "This Flight Plan is not eligible for self-serve checkout." }, 409);
    }
    const body = await context.req.json().catch(() => ({})) as { identity?: { email?: unknown; firstName?: unknown; lastName?: unknown } };
    const email = typeof body.identity?.email === "string" ? body.identity.email.trim() : "";
    if (!email) return context.json({ code: "CHECKOUT_CONTACT_REQUIRED", detail: "A valid email is required to check out." }, 400);
    const firstName = typeof body.identity?.firstName === "string" ? body.identity.firstName.trim() : "";
    const lastName = typeof body.identity?.lastName === "string" ? body.identity.lastName.trim() : "";
    const name = [firstName, lastName].filter(Boolean).join(" ");
    const stripe = options.stripe;
    try {
      const usedFoundingPrice = await foundingSlotsAvailable(options.launchPlanRepository);
      // A real Customer (not just customer_email) is what lets Stripe Checkout
      // actually prefill the name already collected on the Save Flight Plan
      // form, instead of asking the visitor to type it again.
      const customer = await stripe.client.createCustomer({ email, ...(name ? { name } : {}), metadata: { moonrock_session_id: sessionId } });
      const session = await stripe.client.createCheckoutSession({
        mode: "subscription",
        success_url: stripe.successUrl,
        cancel_url: stripe.cancelUrl,
        client_reference_id: sessionId,
        customer: customer.id,
        line_items: [
          { price: usedFoundingPrice ? stripe.foundingSetupPriceId : stripe.standardSetupPriceId, quantity: 1 },
          { price: stripe.monthlyPriceId, quantity: 1 },
        ],
        metadata: { moonrock_offer_id: "moonrock_launch_plan", tier: "launch_plan", moonrock_session_id: sessionId, moonrock_used_founding_price: String(usedFoundingPrice) },
      });
      if (!session.url) throw new Error("Stripe did not return a checkout URL");
      return context.json({ url: session.url });
    } catch (error) {
      console.error(`[create-checkout-session] failed for session ${sessionId}:`, error instanceof Error ? error.stack ?? error.message : error);
      return context.json({ code: "CHECKOUT_SESSION_FAILED", detail: "Moonrock could not start checkout right now." }, 503);
    }
  });

  router.post("/:sessionId/handoff", async (context) => {
    const sessionId = context.req.param("sessionId");
    const current = await repository.load(sessionId);
    if (!current) return context.json({ code: "DISCOVERY_NOT_FOUND" }, 404);
    const body = await context.req.json() as { identity?: ProductionGhlContactIdentity; requestText?: unknown };
    if (!body.identity?.email?.trim()) return context.json({ code: "HANDOFF_CONTACT_REQUIRED", detail: "An email is required so a Moonrock person can follow up without making you start over." }, 400);
    if (typeof body.requestText !== "string" || !body.requestText.trim()) return context.json({ code: "HANDOFF_REQUEST_REQUIRED", detail: "Tell Nova what you want the Moonrock person to pick up from here." }, 400);
    if (!options.productionGhl) return context.json({ code: "HANDOFF_UNAVAILABLE", detail: "Moonrock's handoff connection is not configured right now." }, 503);
    try {
      const result = await handoffHumanRequestToGhl({ sessionId, identity: body.identity, state: current.state, requestText: body.requestText }, options.productionGhl, { apply: options.productionGhl.enabled && options.productionGhl.fieldsVerified && options.productionGhl.writesEnabled });
      return context.json({ humanHandoff: result, answer: result.status === "confirmed" ? "You're set. I saved what we covered and flagged this for a Moonrock person. You won't need to start over." : "I've got your handoff request ready, but Moonrock's live CRM writes are currently disabled." });
    } catch (error) {
      console.error(`[handoff] failed for session ${sessionId}:`, error instanceof Error ? error.stack ?? error.message : error);
      return context.json({ code: "HANDOFF_FAILED", detail: error instanceof Error ? error.message : "Moonrock could not complete the handoff right now." }, 503);
    }
  });

  router.get("/:sessionId", async (context) => {
    const current = await repository.load(context.req.param("sessionId"));
    if (!current) return context.json({ code: "DISCOVERY_NOT_FOUND" }, 404);
    const response = restoreNovaDiscovery(current.state);
    const view = toImmersiveNovaView(response);
    const journey = response.completed && response.result ? completedJourney(response.result.flightPlan) : journeyForProgress(view.progressPercent, false);
    const conversationTurn = await conversationEngine.respond(current.state, "Continue our previous conversation from where we left off.", { resuming: true, progressPercent: view.progressPercent, ...(response.nextQuestion ? { nextNeed: { field: String(response.nextQuestion.field), prompt: response.nextQuestion.prompt } } : {}) });
    return context.json({ state: current.state, version: current.version, response: { ...response, conversationTurn, journey, view } });
  });

  return router;
}
