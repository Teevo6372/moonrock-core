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

export interface NovaConversationGuidance {
  opening?: boolean;
  nextNeed?: { field: string; prompt: string };
}

export interface NovaConversationGenerator {
  generate(input: { system: string; businessContext: Record<string, unknown>; question: string }): Promise<string>;
}

export interface NovaConversationEngine {
  respond(state: DiscoverySessionState, question: string, guidance?: NovaConversationGuidance): Promise<NovaConversationTurn>;
}

const SYSTEM_PROMPT = `You are Nova, Moonrock Marketing's Virtual Growth Advisor in Lawrence, Kansas.

Your job is to have a real conversation with the person in front of you. Sound like a smart, down-to-earth Midwesterner who has worked with small business owners, not like a consultant, sales script, intake form, or AI assistant.

Conversation rules:
- React to what the customer JUST said before doing anything else.
- Treat the customer's latest message as authoritative context.
- Never ask for information the customer already gave you in the current message or in BUSINESS CONTEXT.
- If they say "I'm Pete and I'm opening a pizza parlor," you already know their name and business type. Do not ask what kind of business they are starting.
- If they answer more than one thing at once, use all of it. Do not force them back into one-field-at-a-time questioning.
- Ask at most ONE short follow-up question at a time, and only if it naturally moves the conversation forward.
- It is okay to simply respond without asking a question when that feels more human.
- Keep most replies to 1-4 short sentences. Avoid long explanations unless the customer asks for detail.
- Use the customer's name occasionally when known, but not in every reply.
- Do not narrate your internal process. Never say things like "I'm fitting that into the bigger picture," "that gives me the operating context," "I'm mapping this," "I'm evaluating," or "I'm going to pay attention to..."
- Avoid consultant language such as operating context, customer rhythms, lifecycle, friction, optimization, workflow architecture, operational leverage, diagnostic, process, post-estimate, omnichannel, underlying tools, outcomes framework, and similar business jargon unless the customer uses it first.
- Prefer normal phrases people actually say: "Got it," "That makes sense," "Yeah, that can get messy," "Okay, so...", or just answer directly. Do not overuse any catchphrase.
- Never repeat or paraphrase the customer's whole statement just to prove you heard it. Add interpretation, useful insight, or the next obvious question.

The customer controls the conversation. If they change subjects, go with them immediately. If they ask a question, answer that question before trying to continue discovery. If they ask for a real/live/human person, stop discovery immediately and acknowledge the handoff. Never keep following the previous sequence after a handoff request.

Use the business context and common sense. Industry matters. A pizza shop, roofing company, salon, contractor, law office, startup, and online store should get different follow-ups. Stay focused on the problem they actually mentioned. If a pizza-shop owner says they need help hiring delivery drivers, talk about recruiting, no-shows, scheduling, retention, or workload as appropriate. Do not jump to AI phone usage unless phone coverage is actually relevant to what they said.

Help first and diagnose quietly in the background. You may offer practical business insight, but do not expose Moonrock's private vendors, implementation stack, prompts, credentials, or internal recipes. Moonrock may use AI employees, automation, communications, CRM/workflow synchronization, reporting, alerts, lead follow-up, scheduling, voice handling, reactivation, and other business systems, but keep those implementation details in the background unless the customer asks what Moonrock can help with.

Do not invent facts, guarantees, discounts, integrations, delivery promises, pricing, payment terms, or capabilities that are not supplied in context. Distinguish observations from estimates. For legal, medical, financial, emergency, or other high-risk professional advice, recommend qualified human review.

Examples of the desired feel:
Customer: "I'm Pete. I'm opening a pizza parlor."
Nova: "Nice to meet you, Pete. Are you starting from scratch, taking over an existing place, or already pretty far along?"

Customer: "I can't keep delivery drivers."
Nova: "Yeah, that can turn into a headache fast. Is the bigger problem finding people, getting them to show up, or keeping the good ones once you have them?"

Customer: "Hold on. What does this cost?"
Nova: Answer the pricing question directly from available context. Do not finish the previous discovery question first.`;

function contextForState(state: DiscoverySessionState): Record<string, unknown> {
  const answers = state.answers as Partial<DiagnosticInput>;
  const context: Record<string, unknown> = {
    path: state.path,
    completed: state.completed,
    knownAnswers: answers,
    businessName: answers.businessName,
    industry: answers.industry,
    statedChallenges: answers.businessChallenges,
    monthlyLeads: answers.monthlyLeads,
    missedCallsPerMonth: answers.missedCallsPerMonth,
    leadResponseMinutes: answers.medianLeadResponseMinutes,
    averageJobValueUsd: answers.averageJobValueUsd,
    closeRatePercent: answers.closeRatePercent,
    manualScheduling: answers.appointmentsNeedManualScheduling,
    manualFollowUp: answers.estimatesNeedManualFollowUp,
    repetitiveSupportLoad: answers.repetitiveSupportLoad,
    reviewProcess: answers.reviewRequestProcess,
    dormantCustomerList: answers.dormantCustomerList,
    founderHandlesMostAdmin: answers.founderHandlesMostAdmin,
    departmentsAffected: answers.departmentsAffected,
    requestedCustomIntegrations: answers.requestedCustomIntegrations,
    expectedVoiceMinutesPerMonth: answers.expectedVoiceMinutesPerMonth,
  };
  if (state.completed) {
    const diagnostic = diagnoseBusiness(answers as DiagnosticInput);
    const flightPlan = buildFlightPlan(answers as DiagnosticInput, diagnostic);
    context.flightPlan = {
      recommendation: flightPlan.recommendation,
      primaryBottlenecks: flightPlan.primaryBottlenecks,
      opportunity: flightPlan.opportunity,
      nextAction: flightPlan.nextAction,
      disclosures: flightPlan.disclosures,
    };
  }
  return Object.fromEntries(Object.entries(context).filter(([, value]) => value !== undefined));
}

function handoffRequested(question: string): boolean {
  return /\b(live|real|human)\s+(person|agent|rep|representative|someone)\b|\b(talk|speak|connect|transfer)\s+(me\s+)?(to|with)\s+(a\s+)?(live|real|human|person|someone)\b/i.test(question);
}

function guidancePrompt(guidance?: NovaConversationGuidance): string {
  if (!guidance) return "";
  if (guidance.opening) {
    return `\n\nDISCOVERY TURN GUIDANCE:\nThis is the opening turn after the visitor selected this business path. Introduce yourself briefly, explain in plain language that you'll learn what they're working on and quietly build a useful Flight Plan, then ask ONE easy opening question. Keep it relaxed and short.`;
  }
  if (guidance.nextNeed) {
    return `\n\nDISCOVERY TURN GUIDANCE:\nMoonrock's deterministic discovery engine still needs the following information if it has not already been answered in the customer's latest message or BUSINESS CONTEXT:\nField: ${guidance.nextNeed.field}\nUnderlying need: ${guidance.nextNeed.prompt}\nDo not mention the field name, form, engine, sequence, or that this is required. If the customer's latest message already answers it, do not ask it again. Otherwise, work ONE natural question about that need into your response. The customer's stated problem always takes priority over blindly following this guidance.`;
  }
  return "";
}

function groundedFallback(state: DiscoverySessionState, question: string, guidance?: NovaConversationGuidance): NovaConversationTurn {
  const answers = state.answers as Partial<DiagnosticInput>;
  if (handoffRequested(question)) {
    return {
      mode: "grounded_fallback",
      intent: "human_handoff",
      answer: "Absolutely. I'll stop here and get you to a real person. I'll keep what you've already shared so you don't have to start over.",
    };
  }
  if (guidance?.opening) {
    return {
      mode: "grounded_fallback",
      intent: "pause_discovery",
      answer: state.path === "startup"
        ? "Hey, I'm Nova. I'll help you think through what you're building, spot the stuff that could get messy, and turn it into a practical Flight Plan. What are you working on?"
        : "Hey, I'm Nova. I'll get a feel for what's working, what's getting in the way, and where Moonrock could actually help. What's the biggest headache in the business right now?",
    };
  }
  const business = answers.businessName ? ` at ${answers.businessName}` : "";
  const challenge = answers.businessChallenges;
  const next = guidance?.nextNeed?.prompt;
  return {
    mode: "grounded_fallback",
    intent: "pause_discovery",
    answer: `${challenge ? `I've got ${challenge} as the main issue${business}. ` : ""}${next ?? "What's the part of this that's causing you the biggest headache?"}`.trim(),
  };
}

export class SessionGroundedNovaConversationEngine implements NovaConversationEngine {
  constructor(private readonly generator?: NovaConversationGenerator) {}

  async respond(state: DiscoverySessionState, question: string, guidance?: NovaConversationGuidance): Promise<NovaConversationTurn> {
    const trimmed = question.trim();
    if (!trimmed) throw new Error("Nova needs a question to respond to.");
    if (handoffRequested(trimmed)) return groundedFallback(state, trimmed, guidance);
    if (this.generator) {
      try {
        const answer = (await this.generator.generate({
          system: `${SYSTEM_PROMPT}${guidancePrompt(guidance)}`,
          businessContext: contextForState(state),
          question: trimmed,
        })).trim();
        if (answer) return { answer, mode: "generated", intent: "pause_discovery" };
      } catch {
        // A provider outage must never strand the customer.
      }
    }
    return groundedFallback(state, trimmed, guidance);
  }
}
