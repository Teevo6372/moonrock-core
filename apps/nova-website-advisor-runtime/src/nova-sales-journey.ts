import type { FlightPlan } from "./flight-plan.js";

export type NovaJourneyStage = "learn" | "diagnose" | "recommend" | "explain" | "concerns" | "decide" | "onboard";
export interface ApprovedEvidenceClaim { id: string; source: string; sourceUrl: string; claim: string; allowedUse: string; prohibitedUse: string; }
export const APPROVED_EVIDENCE: readonly ApprovedEvidenceClaim[] = [
  { id: "nist-ai-rmf-trustworthiness", source: "NIST AI Risk Management Framework 1.0", sourceUrl: "https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-ai-rmf-10", claim: "Trustworthy AI should be managed for characteristics including validity and reliability, safety, security and resilience, accountability and transparency, explainability and interpretability, privacy, and fairness.", allowedUse: "Use when a customer raises reliability, safety, privacy, transparency, or human-oversight concerns.", prohibitedUse: "Do not claim NIST certifies, endorses, audits, or guarantees Moonrock or any Moonrock AI Employee." },
  { id: "nist-gai-profile", source: "NIST AI RMF Generative AI Profile (NIST AI 600-1)", sourceUrl: "https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence", claim: "Generative AI introduces risks that should be identified, measured, monitored, and managed throughout deployment and use.", allowedUse: "Use to explain why Moonrock keeps human escalation, monitoring, testing, and boundaries around AI-enabled work.", prohibitedUse: "Do not imply that following NIST guidance eliminates AI errors or guarantees a particular business result." },
];
export interface SalesJourneySummary { stage: NovaJourneyStage; transition: string; recommendationReview?: { confidence: "preliminary" | "confirmed"; offerName: string; setupFeeUsd: number; monthlyFeeUsd: number; includedFeatures: string[]; setupExpectation: string; whatHappensNext: string[]; }; choices?: string[]; }

export function journeyForProgress(progressPercent: number, completed: boolean): SalesJourneySummary {
  if (completed) return { stage: "recommend", transition: "I’ve got enough for a solid starting recommendation. I’ll show you the preliminary Flight Plan now, and we can tighten anything that matters before onboarding." };
  if (progressPercent >= 45) return { stage: "diagnose", transition: "I’ve got the basic picture. I only need the detail that could actually change what I recommend." };
  return { stage: "learn", transition: "I’m getting the essentials first so I can give you something useful without dragging you through a long questionnaire." };
}

export function completedJourney(flightPlan: FlightPlan): SalesJourneySummary {
  return {
    stage: "recommend",
    transition: "Here’s the preliminary Flight Plan I’d start with based on what you told me. We can build from here instead of making you answer everything up front.",
    recommendationReview: {
      confidence: flightPlan.status,
      offerName: flightPlan.recommendation.offerName,
      setupFeeUsd: flightPlan.recommendation.setupFeeUsd,
      monthlyFeeUsd: flightPlan.recommendation.monthlyFeeUsd,
      includedFeatures: flightPlan.recommendation.includedFeatures,
      setupExpectation: `${flightPlan.recommendation.estimatedDelivery}. This is an estimate until final scope, integrations, access, and onboarding details are confirmed.`,
      whatHappensNext: ["Review the preliminary recommendation, included features, approved pricing, and delivery estimate", "Choose to build it now or fine-tune the plan", "Confirm only the remaining details needed for configuration/risk review", "Confirm contact details, consent, approved terms and payment", "Collect onboarding requirements and begin Moonrock implementation"],
    },
    choices: flightPlan.nextAction === "purchase" ? ["Build This Plan", "Fine-Tune It", "Ask Nova", "Talk to a Person", "Not Right Now"] : ["Review With Moonrock", "Fine-Tune It", "Ask Nova", "Talk to a Person", "Not Right Now"],
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
- When the visitor genuinely declines, respect it, offer to save/send the Flight Plan when consent exists, answer remaining questions, and leave the door open without another closing attempt.
- NESTED MINI-ASCENSION (for a bundled a-la-carte offer specifically): when the visitor pushes back on a bundle's price, first identify whether the resistance is about price, scope, or not seeing the value. Briefly explain the reasoning behind the bundle. Then offer a genuine adjustment: drop one component (the exact recomputed price for the remaining items, never an estimate) or point to a cheaper standalone alternative already listed for that bundle. Re-confirm before moving forward. Never restate the same bundle unchanged, and never quote a price below Moonrock's published per-item catalog rate.`;
