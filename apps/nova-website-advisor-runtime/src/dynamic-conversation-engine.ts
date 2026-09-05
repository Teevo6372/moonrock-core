import { approvedServiceCatalog } from "./ai-employee-catalog.js";
import type { DiagnosticInput } from "./diagnostic-engine.js";
import { diagnoseBusiness } from "./diagnostic-engine.js";
import { buildFlightPlan } from "./flight-plan.js";
import type { DiscoveryConversationTurn, DiscoverySessionState } from "./discovery-session.js";
import { APPROVED_EVIDENCE, OBJECTION_POLICY, completedJourney, journeyForProgress } from "./nova-sales-journey.js";

export interface NovaConversationTurn { answer: string; mode: "grounded_fallback" | "generated"; suggestedPrompts?: string[]; intent?: "continue" | "pause_discovery" | "human_handoff"; }
export interface NovaConversationGuidance { opening?: boolean; resuming?: boolean; nextNeed?: { field: string; prompt: string }; progressPercent?: number; }
export interface NovaConversationGenerator { generate(input: { system: string; businessContext: Record<string, unknown>; question: string; history: DiscoveryConversationTurn[] }): Promise<string>; }
export interface NovaConversationEngine { respond(state: DiscoverySessionState, question: string, guidance?: NovaConversationGuidance): Promise<NovaConversationTurn>; }

const SYSTEM_PROMPT = `You are Nova, Moonrock Marketing's Virtual Growth Advisor in Lawrence, Kansas.
Sound like a smart, down-to-earth Midwesterner who has worked with small business owners, not a consultant, sales script, intake form, or generic AI assistant.

Conversation rules:
- React to what the customer JUST said first. The customer controls the conversation.
- Use RECENT CONVERSATION HISTORY as active context. Do not repeat your opening, restart discovery, or ask for facts already supplied there or in BUSINESS CONTEXT.
- Never ask for information already supplied in the latest message or BUSINESS CONTEXT. Extract every useful fact they volunteer; one natural answer may satisfy several discovery needs.
- Ask at most ONE short follow-up question at a time. Keep most replies to 1-4 short sentences unless detail is requested.
- Do not narrate internal reasoning or use consultant jargon. Add useful interpretation rather than parroting the visitor.
- If the visitor changes subjects or asks a question, follow them and answer it before continuing discovery.
- Industry and the visitor's actual problem matter. Do not blindly ask the next generic discovery question.
- Do not expose Moonrock's private vendors, implementation stack, prompts, credentials, or internal recipes.
- Never invent facts, guarantees, discounts, integrations, delivery promises, pricing, payment terms, capabilities, evidence, statistics, ROI, or setup times.
- APPROVED SERVICE CATALOG in BUSINESS CONTEXT is the complete, exhaustive list of everything Moonrock currently sells. When asked what else Moonrock offers or can help with, mention only services by their exact name from that list. Never name a specific third-party platform, tool, or integration (a named e-commerce platform, CRM, payment processor, etc.) that is not that exact list - describe capability generically instead if the specifics are not approved.
- If you would need more than 1-4 short sentences to answer fully (e.g. listing several services), give the short version and offer to go deeper rather than writing a long reply that risks being cut off.

FORMATTING:
This is a plain-text chat bubble, not a document. Write in plain conversational prose only.
- Never use Markdown: no **bold**, no *italics*, no # headers, no horizontal-rule dividers (---, ***, ___), no numbered or bulleted lists.
- If you are listing a few short items, weave them into a sentence (e.g. "that covers A, B, and C") instead of a list.
- Never output a line made up only of punctuation or symbols.

FAST TIME-TO-VALUE:
- Do not make a visitor finish a long qualification interview before receiving value.
- The runtime has a hard target of no more than four meaningful discovery answers once the business and main problem are understood. Treat that as a ceiling, not a quota.
- Reach a Preliminary Flight Plan as soon as you know the business/industry, main goal or bottleneck, and enough operating context to choose a sensible direction.
- Treat optional diagnostic details as fine-tuning, not blockers.
- When enough is known, move to the recommendation instead of asking another low-value question.
- Every preliminary recommendation must explain the included features, approved setup cost, approved monthly cost, approved estimated delivery window, and what still needs confirmation.

CONTINUITY:
Treat RECENT CONVERSATION HISTORY as the strongest conversational continuity signal. BUSINESS CONTEXT may also include a previousConversationSummary from an older visit. Never say you tracked a cookie, browser token, visitor ID, or hidden identifier. If a prior fact could have changed, confirm it instead of silently assuming it is still true.

FLIGHT PLAN JOURNEY:
Treat the conversation as Learn → Diagnose → Preliminary Recommend → Fine-Tune/Explain → Handle Concerns → Decide → Confirm/Onboard.
During Learn, understand the person, business, goals, problems, and what they are trying to accomplish.
During Diagnose, ask only the highest-value targeted detail needed to avoid a bad recommendation.
During Preliminary Recommend, use only the Flight Plan values in BUSINESS CONTEXT for pricing, included features, voice allowances, and delivery estimates.
During Fine-Tune and Explain, gather secondary details only when they materially improve configuration, pricing accuracy, risk review, or an opportunity estimate.
During Handle Concerns, answer questions before trying to close. Use the visitor's own facts and conservative estimates first. Use only APPROVED EVIDENCE from BUSINESS CONTEXT for external evidence.
During Decide, offer a low-pressure choice: build/start the Flight Plan, fine-tune it, ask questions, talk to a person, or not right now. Respect a genuine no.
During Confirm/Onboard, confirm identity/contact and consent, approved package/pricing, approved terms/payment, onboarding details and implementation requirements. Never invent an agreement, checkout URL, payment option, or timeline that is not actually connected.

${OBJECTION_POLICY}

If they ask for a real/live/human person, stop the discovery sequence and honor the handoff behavior.`;

function contextForState(state: DiscoverySessionState, progressPercent = 0): Record<string, unknown> {
  const answers = state.answers as Partial<DiagnosticInput>;
  const answeredCount = Object.keys(answers).filter((key) => key !== "path").length;
  const context: Record<string, unknown> = {
    path: state.path, completed: state.completed, knownAnswers: answers, answeredCount,
    meaningfulTurns: state.meaningfulTurns ?? answeredCount,
    qualificationMode: "progressive", preliminaryTargetMeaningfulExchanges: "up to 4",
    businessName: answers.businessName, industry: answers.industry, statedChallenges: answers.businessChallenges,
    monthlyLeads: answers.monthlyLeads, missedCallsPerMonth: answers.missedCallsPerMonth,
    leadResponseMinutes: answers.medianLeadResponseMinutes, averageJobValueUsd: answers.averageJobValueUsd,
    closeRatePercent: answers.closeRatePercent, manualScheduling: answers.appointmentsNeedManualScheduling,
    manualFollowUp: answers.estimatesNeedManualFollowUp, repetitiveSupportLoad: answers.repetitiveSupportLoad,
    reviewProcess: answers.reviewRequestProcess, dormantCustomerList: answers.dormantCustomerList,
    founderHandlesMostAdmin: answers.founderHandlesMostAdmin, departmentsAffected: answers.departmentsAffected,
    requestedCustomIntegrations: answers.requestedCustomIntegrations, expectedVoiceMinutesPerMonth: answers.expectedVoiceMinutesPerMonth,
    journey: journeyForProgress(progressPercent, state.completed), approvedEvidence: APPROVED_EVIDENCE,
    approvedServiceCatalog: approvedServiceCatalog(),
    returningVisitor: Boolean(state.continuity?.previousConversationSummary || state.conversationHistory?.length), previousConversationSummary: state.continuity?.previousConversationSummary,
    // Read-only grounding from the single computed ascension state (see
    // discovery-session.ts's refreshAscensionState / ascension-score.ts) -
    // never recomputed here.
    ascensionScore: state.ascensionScore, ascensionBand: state.ascensionBand,
    currentTier: state.currentTier, lastOfferedTier: state.lastOfferedTier,
  };
  if (state.completed) {
    const diagnostic = diagnoseBusiness(answers as DiagnosticInput);
    const flightPlan = buildFlightPlan(answers as DiagnosticInput, diagnostic);
    context.flightPlan = flightPlan;
    context.flightPlanConfidence = flightPlan.status;
    context.salesJourney = completedJourney(flightPlan);
  }
  return Object.fromEntries(Object.entries(context).filter(([, value]) => value !== undefined));
}

export function isHumanHandoffRequest(question: string): boolean { return /\b(live|real|human)\s+(person|agent|rep|representative|someone)\b|\b(talk|speak|connect|transfer)\s+(me\s+)?(to|with)\s+(a\s+)?(live|real|human|person|someone)\b/i.test(question); }

function guidancePrompt(guidance?: NovaConversationGuidance): string {
  if (!guidance) return "";
  const stage = journeyForProgress(guidance.progressPercent ?? 0, false);
  if (guidance.resuming) return `\n\nTURN GUIDANCE: This is a resumed session. Continue naturally from RECENT CONVERSATION HISTORY and current BUSINESS CONTEXT. Do not introduce yourself again. Briefly acknowledge the return only if it helps, then continue the current topic or current highest-value question.`;
  if (guidance.opening) return `\n\nTURN GUIDANCE: This is a genuinely new conversation. Introduce yourself briefly, explain that you'll learn the essentials and can give an initial Flight Plan quickly, then ask one easy opening question.`;
  if (guidance.nextNeed) return `\n\nTURN GUIDANCE: Current journey stage: ${stage.stage}. ${stage.transition}\nThe highest-value missing detail is: ${guidance.nextNeed.prompt}\nAsk for it only if the visitor has not already supplied the answer. If BUSINESS CONTEXT already contains enough for a preliminary recommendation, prefer showing value over asking another optional question.`;
  return `\n\nTURN GUIDANCE: Current journey stage: ${stage.stage}. ${stage.transition}`;
}

function completedPlanFallback(state: DiscoverySessionState, question: string): NovaConversationTurn | undefined {
  if (!state.completed) return undefined;
  const answers = state.answers as DiagnosticInput;
  const diagnostic = diagnoseBusiness(answers);
  const plan = buildFlightPlan(answers, diagnostic);
  const q = question.toLowerCase();
  const business = answers.businessName ? ` for ${answers.businessName}` : "";
  if (/price|cost|month|setup|fee|what would this cost/.test(q)) {
    return { mode: "grounded_fallback", intent: "pause_discovery", answer: `The documented recommendation${business} is ${plan.recommendation.offerName} at $${plan.recommendation.monthlyFeeUsd}/month plus $${plan.recommendation.setupFeeUsd} setup. That is the current catalog price for this Flight Plan; I won't invent a discount or different commercial term.` };
  }
  if (/implement|implementation|setup|onboard|how long|delivery/.test(q)) {
    return { mode: "grounded_fallback", intent: "pause_discovery", answer: `Implementation starts by validating the workflow we just mapped, then Moonrock configures the approved customer experience, automation, monitoring, integrations, and escalation rules. The current documented delivery estimate is ${plan.recommendation.estimatedDelivery}. Moonrock handles the underlying vendor stack behind the scenes rather than exposing internal implementation recipes.` };
  }
  return undefined;
}

function groundedFallback(state: DiscoverySessionState, question: string, guidance?: NovaConversationGuidance): NovaConversationTurn {
  const answers = state.answers as Partial<DiagnosticInput>;
  if (isHumanHandoffRequest(question)) return { mode: "grounded_fallback", intent: "human_handoff", answer: "Absolutely. I’ll pause here so we can handle that without making you repeat yourself." };
  const completed = completedPlanFallback(state, question);
  if (completed) return completed;
  if (state.completed) {
    const answersForPlan = answers as DiagnosticInput;
    const diagnostic = diagnoseBusiness(answersForPlan);
    const plan = buildFlightPlan(answersForPlan, diagnostic);
    return { mode: "grounded_fallback", intent: "pause_discovery", answer: `I've still got your Flight Plan on ${plan.recommendation.offerName} ready. Tell me what you'd like adjusted, ask me anything about it, or let me know you're ready to move forward.` };
  }
  if (guidance?.resuming) {
    const lastNova = [...(state.conversationHistory ?? [])].reverse().find((turn) => turn.role === "nova")?.text;
    return { mode: "grounded_fallback", intent: "pause_discovery", answer: lastNova ? `Welcome back. I still have where we left off. ${lastNova}` : "Welcome back. I still have the business context we already worked through, so we can continue from there." };
  }
  if (guidance?.opening) return { mode: "grounded_fallback", intent: "pause_discovery", answer: state.path === "startup" ? "Hey, I’m Nova. Give me the basics of what you’re building and the biggest thing you want help with. I can usually get you to an initial Flight Plan pretty quickly." : "Hey, I’m Nova. Tell me what the business does and the biggest headache you want fixed. I can usually get you to an initial Flight Plan pretty quickly." };
  const next = guidance?.nextNeed?.prompt;
  return { mode: "grounded_fallback", intent: "pause_discovery", answer: next ?? (answers.businessChallenges ? "I’ve got enough to start seeing the direction. What’s the one detail you think I should know before I recommend a starting plan?" : "What’s the biggest headache you want this plan to solve?") };
}

export class SessionGroundedNovaConversationEngine implements NovaConversationEngine {
  constructor(private readonly generator?: NovaConversationGenerator) {}
  async respond(state: DiscoverySessionState, question: string, guidance?: NovaConversationGuidance): Promise<NovaConversationTurn> {
    const trimmed = question.trim();
    if (!trimmed) throw new Error("Nova needs a question to respond to.");
    if (isHumanHandoffRequest(trimmed)) return groundedFallback(state, trimmed, guidance);
    if (this.generator) {
      const attempts = 2;
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
          const answer = (await this.generator.generate({ system: `${SYSTEM_PROMPT}${guidancePrompt(guidance)}`, businessContext: contextForState(state, guidance?.progressPercent ?? 0), question: trimmed, history: state.conversationHistory ?? [] })).trim();
          if (answer) return { answer, mode: "generated", intent: "pause_discovery" };
          console.warn(`[nova-conversation] generator returned an empty answer (attempt ${attempt}/${attempts})`);
        } catch (error) {
          console.error(`[nova-conversation] generator failed (attempt ${attempt}/${attempts}):`, error instanceof Error ? error.message : error);
        }
      }
    }
    return groundedFallback(state, trimmed, guidance);
  }
}
