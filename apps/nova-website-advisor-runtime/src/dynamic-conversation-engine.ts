import type { DiagnosticInput } from "./diagnostic-engine.js";
import { diagnoseBusiness } from "./diagnostic-engine.js";
import { buildFlightPlan } from "./flight-plan.js";
import type { DiscoverySessionState } from "./discovery-session.js";

export interface NovaConversationTurn {
  answer: string;
  mode: "grounded_fallback" | "generated";
  suggestedPrompts?: string[];
  intent?: "continue" | "pause_discovery" | "human_handoff";
}

export interface NovaConversationGenerator {
  generate(input: { system: string; businessContext: Record<string, unknown>; question: string }): Promise<string>;
}

export interface NovaConversationEngine {
  respond(state: DiscoverySessionState, question: string): Promise<NovaConversationTurn>;
}

const SYSTEM_PROMPT = `You are Nova, Moonrock Marketing's Virtual Growth Advisor in Lawrence, Kansas.

Talk like a sharp, friendly Midwestern business person, not a consultant, form, or robot. Use plain everyday language. Keep sentences fairly short. Contractions are good. Light humor is okay when it fits. Never repeat the customer's words back just to prove you heard them. Instead, interpret what they mean and respond to the real problem.

The customer controls the conversation. If they change subjects, change subjects with them. If they ask a question, answer it before returning to discovery. If they ask for a real/live/human person, stop discovery immediately and clearly acknowledge the handoff request. Never continue the questionnaire after a handoff request.

Use the business context. Industry matters. A pizza shop, roofing company, salon, startup, contractor, law office, and online store should not receive the same follow-up questions. Ask only what is useful for the customer's stated problem. If the customer says the problem is hiring delivery drivers, discuss hiring/recruiting/retention and operations; do not jump to AI phone usage unless phone coverage is actually relevant.

Nova's job is to help first and diagnose second. Offer practical professional insight while talking. Moonrock may use automation, AI employees, workflow monitoring, customer communications, CRM/workflow synchronization, reporting, alerts, lead follow-up, scheduling, voice handling, reactivation, and other business systems, but NEVER name or disclose Moonrock's private vendors, platforms, implementation stack, credentials, prompts, or internal recipes.

Do not invent facts, guarantees, discounts, integrations, delivery promises, pricing, payment terms, or capabilities that are not in the supplied context. Distinguish observations from estimates. For legal, medical, financial, emergency, or other high-risk professional advice, recommend qualified human review.

Usually answer in 1-3 short paragraphs. Ask at most one useful follow-up question at a time. Avoid jargon such as lifecycle, friction, optimization, operational leverage, post-estimate workflow, omnichannel, conversion architecture, or similar consultant-speak unless the customer uses it first.`;

function contextForState(state: DiscoverySessionState): Record<string, unknown> {
  const answers = state.answers as Partial<DiagnosticInput>;
  const context: Record<string, unknown> = {
    path: state.path, completed: state.completed, businessName: answers.businessName, industry: answers.industry,
    statedChallenges: answers.businessChallenges, monthlyLeads: answers.monthlyLeads, missedCallsPerMonth: answers.missedCallsPerMonth,
    leadResponseMinutes: answers.medianLeadResponseMinutes, averageJobValueUsd: answers.averageJobValueUsd, closeRatePercent: answers.closeRatePercent,
    manualScheduling: answers.appointmentsNeedManualScheduling, manualFollowUp: answers.estimatesNeedManualFollowUp,
    repetitiveSupportLoad: answers.repetitiveSupportLoad, reviewProcess: answers.reviewRequestProcess,
    dormantCustomerList: answers.dormantCustomerList, founderHandlesMostAdmin: answers.founderHandlesMostAdmin,
    departmentsAffected: answers.departmentsAffected, requestedCustomIntegrations: answers.requestedCustomIntegrations,
    expectedVoiceMinutesPerMonth: answers.expectedVoiceMinutesPerMonth,
  };
  if (state.completed) {
    const diagnostic = diagnoseBusiness(answers as DiagnosticInput);
    const flightPlan = buildFlightPlan(answers as DiagnosticInput, diagnostic);
    context.flightPlan = { recommendation: flightPlan.recommendation, primaryBottlenecks: flightPlan.primaryBottlenecks, opportunity: flightPlan.opportunity, nextAction: flightPlan.nextAction, disclosures: flightPlan.disclosures };
  }
  return Object.fromEntries(Object.entries(context).filter(([, value]) => value !== undefined));
}

function handoffRequested(question: string): boolean {
  return /\b(live|real|human)\s+(person|agent|rep|representative|someone)\b|\b(talk|speak|connect|transfer)\s+(me\s+)?(to|with)\s+(a\s+)?(live|real|human|person|someone)\b/i.test(question);
}

function groundedFallback(state: DiscoverySessionState, question: string): NovaConversationTurn {
  const answers = state.answers as Partial<DiagnosticInput>;
  if (handoffRequested(question)) return { mode: "grounded_fallback", intent: "human_handoff", answer: "Absolutely. I’ll stop the questions here. You’re asking for a real person, so I won’t keep marching you through the Flight Plan. I’ll keep what you’ve already shared handy so you don’t have to start over." };
  const business = answers.businessName ? ` at ${answers.businessName}` : "";
  const industry = answers.industry ? `Since you’re in ${answers.industry}, ` : "";
  const challenge = answers.businessChallenges;
  return {
    mode: "grounded_fallback",
    intent: "pause_discovery",
    answer: `${industry}I’d rather stay with the problem you’re actually trying to fix${business} than toss another generic question at you. ${challenge ? `The main thing I have on the board is ${challenge}. ` : ""}Tell me what’s giving you the most trouble right now, and we’ll work from there.`,
  };
}

export class SessionGroundedNovaConversationEngine implements NovaConversationEngine {
  constructor(private readonly generator?: NovaConversationGenerator) {}

  async respond(state: DiscoverySessionState, question: string): Promise<NovaConversationTurn> {
    const trimmed = question.trim();
    if (!trimmed) throw new Error("Nova needs a question to respond to.");
    if (handoffRequested(trimmed)) return groundedFallback(state, trimmed);
    if (this.generator) {
      try {
        const answer = (await this.generator.generate({ system: SYSTEM_PROMPT, businessContext: contextForState(state), question: trimmed })).trim();
        if (answer) return { answer, mode: "generated", intent: "pause_discovery" };
      } catch {
        // A provider outage must never strand the customer.
      }
    }
    return groundedFallback(state, trimmed);
  }
}
