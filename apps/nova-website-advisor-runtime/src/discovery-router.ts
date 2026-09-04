import { Hono } from "hono";
import type { AnswerInterpreter } from "./answer-interpreter.js";
import type { DiagnosticInput } from "./diagnostic-engine.js";
import { requestPreliminaryFlightPlan, restoreNovaDiscovery, startNovaDiscovery, submitNovaDiscoveryAnswer, type NovaDiscoveryResponse } from "./discovery-api-contract.js";
import { InMemoryDiscoveryStateRepository, type DiscoveryStateRepository } from "./discovery-state-repository.js";
import { appendConversationExchange, isFlightPlanRequest, type DiscoverySessionState } from "./discovery-session.js";
import { isHumanHandoffRequest, SessionGroundedNovaConversationEngine, type NovaConversationEngine, type NovaConversationTurn } from "./dynamic-conversation-engine.js";
import { handoffFlightPlanToGhl, handoffHumanRequestToGhl, type ProductionGhlContactIdentity, type ProductionGhlHandoffConfig } from "./ghl-production-handoff.js";
import { toImmersiveNovaView } from "./higgsfield-ui-adapter.js";
import { completedJourney, journeyForProgress } from "./nova-sales-journey.js";

export interface DiscoveryRouterOptions { productionGhl?: ProductionGhlHandoffConfig; conversationEngine?: NovaConversationEngine; answerInterpreter?: AnswerInterpreter; }

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

function completionAnswerForTier(response: NovaDiscoveryResponse): string {
  if (response.websiteBuildResult) {
    return `I have enough to put together a starting brief. Here's the preliminary direction for ${response.websiteBuildResult.brief.offerName}; anything still unknown is an assumption we can confirm before build work begins.`;
  }
  if (response.ghlSaasResult) {
    return "I have enough to give you a starting recommendation for your white-label setup; anything still unknown is an assumption we can confirm before provisioning.";
  }
  return "I have enough to give you a useful starting direction. Here's your Preliminary Flight Plan; anything still unknown is an assumption we can fine-tune after you see the recommendation.";
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
    const result = startNovaDiscovery(body.path, { visitorId, conversationId, ...(previousConversationSummary ? { previousConversationSummary } : {}) });
    const openingText = body.path === "startup" ? "I'm starting something." : "My business needs to grow.";
    const conversationTurn = await conversationEngine.respond(result.state, openingText, { opening: true, progressPercent: 0 });
    const state = appendConversationExchange(result.state, openingText, conversationTurn.answer);
    try { await repository.create(sessionId, state); } catch { return context.json({ code: "DISCOVERY_ALREADY_EXISTS" }, 409); }
    return context.json({ ...result.response, conversationTurn, journey: journeyForProgress(0, false), view: toImmersiveNovaView(result.response) }, 201);
  });

  router.post("/:sessionId/answers", async (context) => {
    const sessionId = context.req.param("sessionId");
    const current = await repository.load(sessionId);
    if (!current) return context.json({ code: "DISCOVERY_NOT_FOUND" }, 404);
    if (current.state.completed) return context.json({ code: "DISCOVERY_COMPLETE" }, 409);
    const body = await context.req.json() as { field?: unknown; value?: unknown; identity?: ProductionGhlContactIdentity };
    if (typeof body.field !== "string" || !("value" in body)) return context.json({ code: "INVALID_DISCOVERY_ANSWER" }, 400);
    const rawCustomerText = typeof body.value === "string" ? body.value : String(body.value);

    if (isHumanHandoffRequest(rawCustomerText)) {
      const currentView = responseWithView(current.state);
      const conversationTurn = await conversationEngine.respond(current.state, rawCustomerText, { progressPercent: currentView.view.progressPercent });
      const state = appendConversationExchange(current.state, rawCustomerText, conversationTurn.answer);
      try { await repository.save(sessionId, state, current.version); } catch { return context.json({ code: "DISCOVERY_VERSION_CONFLICT" }, 409); }
      return context.json({ ...currentView.response, conversationTurn, humanHandoff: handoffPrompt(rawCustomerText), journey: currentView.journey, view: { ...currentView.view, visualState: "handoff" } });
    }

    const result = isFlightPlanRequest(rawCustomerText)
      ? requestPreliminaryFlightPlan(current.state)
      : await submitNovaDiscoveryAnswer(current.state, body.field as keyof DiagnosticInput, body.value, options.answerInterpreter);
    const view = toImmersiveNovaView(result.response);
    const journey = result.response.completed && result.response.result ? completedJourney(result.response.result.flightPlan) : journeyForProgress(view.progressPercent, false);
    const conversationTurn: NovaConversationTurn = result.response.clarification
      ? { answer: result.response.clarification.message, mode: "grounded_fallback", intent: "pause_discovery" }
      : result.response.completed
        ? { answer: completionAnswerForTier(result.response), mode: "grounded_fallback", intent: "pause_discovery" }
        : await conversationEngine.respond(result.state, rawCustomerText, { progressPercent: view.progressPercent, ...(result.response.nextQuestion ? { nextNeed: { field: String(result.response.nextQuestion.field), prompt: result.response.nextQuestion.prompt } } : {}) });
    const state = appendConversationExchange(result.state, rawCustomerText, conversationTurn.answer);
    try { await repository.save(sessionId, state, current.version); } catch { return context.json({ code: "DISCOVERY_VERSION_CONFLICT" }, 409); }
    return context.json({ ...result.response, conversationTurn, journey, view });
  });

  router.post("/:sessionId/conversation", async (context) => {
    const sessionId = context.req.param("sessionId");
    const current = await repository.load(sessionId);
    if (!current) return context.json({ code: "DISCOVERY_NOT_FOUND" }, 404);
    const body = await context.req.json() as { question?: unknown };
    if (typeof body.question !== "string" || !body.question.trim()) return context.json({ code: "INVALID_NOVA_QUESTION" }, 400);
    const question = body.question.trim();

    if (!current.state.completed && isFlightPlanRequest(question)) {
      const result = requestPreliminaryFlightPlan(current.state);
      const answer = `Absolutely. I'm stopping discovery here. ${completionAnswerForTier(result.response)}`;
      const conversationTurn: NovaConversationTurn = { answer, mode: "grounded_fallback", intent: "pause_discovery" };
      const state = appendConversationExchange(result.state, question, answer);
      try { await repository.save(sessionId, state, current.version); } catch { return context.json({ code: "DISCOVERY_VERSION_CONFLICT" }, 409); }
      const view = toImmersiveNovaView(result.response);
      return context.json({ answer, mode: conversationTurn.mode, intent: conversationTurn.intent, ...result.response, conversationTurn, journey: result.response.result ? completedJourney(result.response.result.flightPlan) : journeyForProgress(100, true), view });
    }

    const currentView = responseWithView(current.state);
    try {
      const turn = await conversationEngine.respond(current.state, question, { progressPercent: currentView.view.progressPercent });
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
      const result = await handoffFlightPlanToGhl({ sessionId, identity: body.identity, diagnosticInput: current.state.answers as DiagnosticInput, diagnostic: restored.result.diagnostic, flightPlan: restored.result.flightPlan }, options.productionGhl, { apply: options.productionGhl.enabled && options.productionGhl.fieldsVerified && options.productionGhl.writesEnabled });
      return context.json({ status: result.status, answer: result.status === "confirmed" ? "Your Flight Plan is saved with Moonrock." : "Your Flight Plan details are ready, but live CRM writes are currently disabled." });
    } catch (error) {
      return context.json({ code: "FLIGHT_PLAN_SAVE_FAILED", detail: error instanceof Error ? error.message : "Moonrock could not save the Flight Plan right now." }, 503);
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
