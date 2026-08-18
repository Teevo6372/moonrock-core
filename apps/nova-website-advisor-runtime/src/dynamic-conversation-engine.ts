import type { DiagnosticInput } from "./diagnostic-engine.js";
import { diagnoseBusiness } from "./diagnostic-engine.js";
import { buildFlightPlan } from "./flight-plan.js";
import type { DiscoverySessionState } from "./discovery-session.js";

export interface NovaConversationTurn {
  answer: string;
  mode: "grounded_fallback" | "generated";
  suggestedPrompts?: string[];
}

export interface NovaConversationGenerator {
  generate(input: {
    system: string;
    businessContext: Record<string, unknown>;
    question: string;
  }): Promise<string>;
}

export interface NovaConversationEngine {
  respond(state: DiscoverySessionState, question: string): Promise<NovaConversationTurn>;
}

const SYSTEM_PROMPT = `You are Nova, Moonrock Marketing's Virtual Growth Advisor. Speak in a relaxed, capable Midwestern tone: warm, practical, straightforward, and never pushy. Use the supplied business context, do not invent facts, guarantees, discounts, integrations, delivery promises, or vendor/tool names. Explain capabilities and outcomes rather than Moonrock's private implementation stack. Distinguish observations from estimates. If the question asks for legal, medical, financial, emergency, or other high-risk professional advice, recommend human review rather than pretending certainty. Keep answers useful and concise, and connect the response back to the visitor's Flight Plan when relevant.`;

function contextForState(state: DiscoverySessionState): Record<string, unknown> {
  const answers = state.answers as Partial<DiagnosticInput>;
  const context: Record<string, unknown> = {
    path: state.path,
    completed: state.completed,
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

function classifyQuestion(question: string): "pricing" | "payments" | "implementation" | "local" | "recommendation" | "voice" | "services" | "general" {
  const q = question.toLowerCase();
  if (/price|pricing|cost|setup fee|monthly|how much/.test(q)) return "pricing";
  if (/payment|pay|installment|financ|deposit/.test(q)) return "payments";
  if (/implement|implementation|onboard|setup|how long|timeline|deploy/.test(q)) return "implementation";
  if (/local|lawrence|kansas|nearby|in person|partner/.test(q)) return "local";
  if (/why|recommend|flight plan|what would you do|priority|first/.test(q)) return "recommendation";
  if (/voice|phone|call|minutes|hours|after.?hours|weekend/.test(q)) return "voice";
  if (/service|website|crm|automation|follow.?up|scheduling|support|review/.test(q)) return "services";
  return "general";
}

function groundedFallback(state: DiscoverySessionState, question: string): NovaConversationTurn {
  const answers = state.answers as Partial<DiagnosticInput>;
  const topic = classifyQuestion(question);
  const business = answers.businessName ? ` for ${answers.businessName}` : "";

  if (topic === "pricing" && state.completed) {
    const diagnostic = diagnoseBusiness(answers as DiagnosticInput);
    const plan = buildFlightPlan(answers as DiagnosticInput, diagnostic);
    return {
      mode: "grounded_fallback",
      answer: `Based on the Flight Plan${business}, the current recommendation is ${plan.recommendation.offerName} at $${plan.recommendation.monthlyFeeUsd}/month plus a $${plan.recommendation.setupFeeUsd} setup fee. I’d treat that as the approved starting price for the scope we’ve identified. If implementation uncovers unusual integrations, compliance requirements, or much heavier usage, Moonrock would review that with you before changing the scope.`,
      suggestedPrompts: ["What does implementation include?", "Why did you recommend this first?", "What payment options can we discuss?"],
    };
  }

  if (topic === "payments") {
    return {
      mode: "grounded_fallback",
      answer: "Moonrock can walk through practical payment timing and any approved payment arrangements before anything is signed. I don’t want to invent financing terms here, so the useful next step is to decide whether the recommended scope makes sense first; then we can confirm the payment structure that is actually available.",
      suggestedPrompts: ["What does implementation look like?", "Can we start with a smaller scope?"],
    };
  }

  if (topic === "implementation") {
    return {
      mode: "grounded_fallback",
      answer: `Implementation${business} starts by validating the workflow we just mapped. Moonrock then configures the customer-facing experience, automation, monitoring, integrations, and escalation rules around the agreed outcome. We keep the underlying vendor stack in the background so you don’t have to become the systems integrator, and we verify the workflow with you before anything customer-facing is treated as finished.`,
      suggestedPrompts: ["What would you automate first?", "What would still need a human?"],
    };
  }

  if (topic === "local") {
    return {
      mode: "grounded_fallback",
      answer: "Moonrock is based in Lawrence, Kansas, so local businesses can work with us like a nearby technology partner while still getting systems designed to support customers remotely and around the clock. The goal is to combine local accountability with automation that doesn’t stop when the office closes.",
      suggestedPrompts: ["Can Moonrock work with my existing systems?", "What would support look like after launch?"],
    };
  }

  if (topic === "voice") {
    const voice = answers.expectedVoiceMinutesPerMonth;
    const coverage = answers.businessChallenges ? ` Your earlier context was: “${answers.businessChallenges}.”` : "";
    return {
      mode: "grounded_fallback",
      answer: voice && voice > 0
        ? `I’m currently carrying roughly ${Math.round(voice)} voice minutes per month as a planning estimate${business}. That isn’t a usage commitment; I’d validate actual call patterns before finalizing voice economics.${coverage}`
        : `I wouldn’t force you to guess a phone-usage number yet. The better starting point is the coverage pattern—after-hours, weekends, overflow, or full-time handling—and then measure real traffic before we lock usage assumptions.${coverage}`,
      suggestedPrompts: ["What happens when Nova cannot answer a call?", "How would after-hours coverage work?"],
    };
  }

  if (topic === "recommendation" && state.completed) {
    const diagnostic = diagnoseBusiness(answers as DiagnosticInput);
    const plan = buildFlightPlan(answers as DiagnosticInput, diagnostic);
    const top = plan.primaryBottlenecks.map((item) => item.id.replaceAll("_", " ")).join(", ");
    return {
      mode: "grounded_fallback",
      answer: `I’d start with ${plan.recommendation.offerName}${business} because the strongest signals in the conversation were ${top || "the operating gaps we identified"}. I’m not saying everything else is unimportant; I’m saying this is the smallest practical place to create leverage first without overbuilding the system. ${plan.recommendation.reason}`,
      suggestedPrompts: ["What would you automate first?", "What would you leave alone?", "What happens after I approve the plan?"],
    };
  }

  if (topic === "services") {
    return {
      mode: "grounded_fallback",
      answer: "Moonrock 2.0 centers on AI Employees, but the work around them can include lead capture, customer response, voice handling, scheduling, follow-up, CRM workflows, reporting, review and reactivation workflows, integrations, and operational automation when those pieces support the same business outcome. I’d rather connect those capabilities to the bottleneck you’re trying to solve than hand you a giant menu of services.",
      suggestedPrompts: ["Which of those applies to my Flight Plan?", "What would you avoid automating?"],
    };
  }

  const challenge = answers.businessChallenges;
  const industry = answers.industry;
  return {
    mode: "grounded_fallback",
    answer: `I can answer that best by keeping it tied to what you’ve already told me${business}. ${industry ? `You’re operating in ${industry}, ` : ""}${challenge ? `and the main issue you described was “${challenge}.” ` : ""}I don’t want to make up a specific promise from a vague question. Tell me which part you want to dig into—recommendation, implementation, pricing, phone coverage, follow-up, or what I’d prioritize first—and I’ll stay grounded in your Flight Plan.`,
    suggestedPrompts: ["What would you prioritize first?", "What would implementation include?", "Why this recommendation?"],
  };
}

export class SessionGroundedNovaConversationEngine implements NovaConversationEngine {
  constructor(private readonly generator?: NovaConversationGenerator) {}

  async respond(state: DiscoverySessionState, question: string): Promise<NovaConversationTurn> {
    const trimmed = question.trim();
    if (!trimmed) throw new Error("Nova needs a question to respond to.");

    if (this.generator) {
      try {
        const answer = (await this.generator.generate({
          system: SYSTEM_PROMPT,
          businessContext: contextForState(state),
          question: trimmed,
        })).trim();
        if (answer) return { answer, mode: "generated" };
      } catch {
        // Preserve the customer experience if a controlled model provider is unavailable.
      }
    }

    return groundedFallback(state, trimmed);
  }
}
