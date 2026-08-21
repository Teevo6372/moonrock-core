import type { FlightPlan } from "./flight-plan.js";

export type NovaJourneyStage = "learn" | "diagnose" | "recommend" | "explain" | "concerns" | "decide" | "onboard";

export interface ApprovedEvidenceClaim {
  id: string;
  source: string;
  sourceUrl: string;
  claim: string;
  allowedUse: string;
  prohibitedUse: string;
}

export const APPROVED_EVIDENCE: readonly ApprovedEvidenceClaim[] = [
  {
    id: "nist-ai-rmf-trustworthiness",
    source: "NIST AI Risk Management Framework 1.0",
    sourceUrl: "https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-ai-rmf-10",
    claim: "Trustworthy AI should be managed for characteristics including validity and reliability, safety, security and resilience, accountability and transparency, explainability and interpretability, privacy, and fairness.",
    allowedUse: "Use when a customer raises reliability, safety, privacy, transparency, or human-oversight concerns.",
    prohibitedUse: "Do not claim NIST certifies, endorses, audits, or guarantees Moonrock or any Moonrock AI Employee.",
  },
  {
    id: "nist-gai-profile",
    source: "NIST AI RMF Generative AI Profile (NIST AI 600-1)",
    sourceUrl: "https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence",
    claim: "Generative AI introduces risks that should be identified, measured, monitored, and managed throughout deployment and use.",
    allowedUse: "Use to explain why Moonrock keeps human escalation, monitoring, testing, and boundaries around AI-enabled work.",
    prohibitedUse: "Do not imply that following NIST guidance eliminates AI errors or guarantees a particular business result.",
  },
];

export interface SalesJourneySummary {
  stage: NovaJourneyStage;
  transition: string;
  recommendationReview?: {
    offerName: string;
    setupFeeUsd: number;
    monthlyFeeUsd: number;
    setupExpectation: string;
    whatHappensNext: string[];
  };
  choices?: string[];
}

export function journeyForProgress(progressPercent: number, completed: boolean): SalesJourneySummary {
  if (completed) return { stage: "recommend", transition: "I’ve got enough to make a recommendation. Let me walk you through what I’d do, why, what it costs, and what happens next." };
  if (progressPercent >= 55) return { stage: "diagnose", transition: "I’ve got the shape of it now. I want to tighten up a few details so I don’t build your Flight Plan around assumptions." };
  return { stage: "learn", transition: "I’m getting a feel for the business first so the recommendation fits what you actually need." };
}

export function completedJourney(flightPlan: FlightPlan): SalesJourneySummary {
  return {
    stage: "recommend",
    transition: "Here’s the Flight Plan I’d recommend based on what you told me. I’ll show you why it fits before I ask you to decide anything.",
    recommendationReview: {
      offerName: flightPlan.recommendation.offerName,
      setupFeeUsd: flightPlan.recommendation.setupFeeUsd,
      monthlyFeeUsd: flightPlan.recommendation.monthlyFeeUsd,
      setupExpectation: "Setup timing depends on the approved scope and integrations. Nova must not invent a delivery date; confirm the implementation window during onboarding or human review.",
      whatHappensNext: [
        "Review the recommendation and pricing",
        "Answer questions or adjust the plan",
        "Confirm contact details and consent",
        "Confirm approved terms and payment",
        "Collect onboarding details and implementation requirements",
        "Begin Moonrock implementation and keep Nova available for questions",
      ],
    },
    choices: flightPlan.nextAction === "purchase"
      ? ["Start My Flight Plan", "Adjust My Plan", "Ask Nova a Question", "Talk to a Person", "Not Right Now"]
      : ["Review With Moonrock", "Adjust My Plan", "Ask Nova a Question", "Talk to a Person", "Not Right Now"],
  };
}

export const OBJECTION_POLICY = `OBJECTION AND BUYER-CONCERN POLICY:
- First decide whether the visitor is asking a question, expressing a concern, objecting, misunderstanding something, or genuinely declining. Do not treat every hesitation as an objection.
- Never pressure, guilt, corner, shame, or repeatedly rebut a visitor who says no.
- For a real objection: acknowledge it, ask one short clarifying question when needed, answer with the customer's own business facts first, then use approved evidence only when it actually helps.
- Never invent statistics, benchmarks, savings, ROI, customer results, guarantees, scarcity, deadlines, discounts, payment terms, setup times, or implementation promises.
- Customer-specific math must be labeled as an estimate and use only known customer inputs and approved formulas.
- Approved external evidence may support general claims but must never be presented as proof that Moonrock will achieve the same result for this customer.
- For AI reliability, safety, privacy, transparency, or human-oversight concerns, you may explain that Moonrock's approach is consistent with NIST's risk-management principles: define intended use, test and measure, monitor, manage risk, preserve human escalation, and communicate limitations. Never say NIST endorses or certifies Moonrock.
- Common concerns include price/ROI, replacing employees, customers wanting humans, AI mistakes, privacy/security, being too small, implementation workload, DIY alternatives, existing software, needing time, needing partner/team approval, contract/payment concerns, implementation timing, and wanting a human.
- When the visitor genuinely declines, respect it, offer to save/send the Flight Plan when consent exists, answer remaining questions, and leave the door open without another closing attempt.`;
