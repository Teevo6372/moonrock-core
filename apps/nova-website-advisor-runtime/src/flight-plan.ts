import { AI_EMPLOYEE_CATALOG, priceOffer } from "./ai-employee-catalog.js";
import type { DiagnosticInput, DiagnosticResult } from "./diagnostic-engine.js";

export interface FlightPlan {
  version: "1.0";
  status: "preliminary" | "confirmed";
  businessPath: DiagnosticInput["path"];
  businessName: string | null;
  headline: string;
  primaryBottlenecks: Array<{
    id: string;
    score: number;
    explanation: string;
  }>;
  recommendation: {
    offerId: DiagnosticResult["recommendedOfferId"];
    offerName: string;
    setupFeeUsd: number;
    monthlyFeeUsd: number;
    includedFeatures: string[];
    estimatedDelivery: string;
    includedVoiceMinutes?: number;
    overageVoiceRateUsd?: number;
    autonomousCloseAllowed: boolean;
    reason: string;
  };
  opportunity: DiagnosticResult["opportunityEstimate"] | null;
  nextAction: "purchase" | "human_review" | "continue_discovery";
  assumptionsToConfirm: string[];
  disclosures: string[];
}

export function buildFlightPlan(
  input: DiagnosticInput,
  diagnosis: DiagnosticResult,
  options: { foundingCustomer?: boolean; confirmed?: boolean } = {},
): FlightPlan {
  const pricedOffer = priceOffer(diagnosis.recommendedOfferId, options);
  const catalogOffer = AI_EMPLOYEE_CATALOG[diagnosis.recommendedOfferId];
  const hasMeaningfulDiagnosis = diagnosis.bottlenecks.length > 0;
  const nextAction = !hasMeaningfulDiagnosis
    ? "continue_discovery"
    : diagnosis.autonomousCloseAllowed
      ? "purchase"
      : "human_review";

  const assumptionsToConfirm: string[] = [];
  if (input.monthlyLeads === undefined) assumptionsToConfirm.push("Typical lead/customer inquiry volume");
  if (input.requestedCustomIntegrations === undefined) assumptionsToConfirm.push("Any existing systems or integrations that need to be included");
  if (catalogOffer.includedVoiceMinutes !== undefined && input.expectedVoiceMinutesPerMonth === undefined) assumptionsToConfirm.push("Expected phone/voice usage and coverage pattern");
  if (input.path === "existing_business" && input.departmentsAffected === undefined) assumptionsToConfirm.push("Which business functions need to be included in the initial scope");
  if (input.path === "startup" && input.founderHandlesMostAdmin === undefined) assumptionsToConfirm.push("Who will own calls, follow-up, and customer administration at launch");

  return {
    version: "1.0",
    status: options.confirmed ? "confirmed" : "preliminary",
    businessPath: input.path,
    businessName: input.businessName ?? null,
    headline: input.path === "startup"
      ? "Your Preliminary Moonrock Startup Flight Plan"
      : "Your Preliminary Moonrock Growth Flight Plan",
    primaryBottlenecks: diagnosis.bottlenecks.slice(0, 3).map((finding) => ({
      id: finding.id,
      score: finding.score,
      explanation: finding.reason,
    })),
    recommendation: {
      offerId: diagnosis.recommendedOfferId,
      offerName: catalogOffer.name,
      setupFeeUsd: pricedOffer.setupFeeUsd,
      monthlyFeeUsd: pricedOffer.monthlyFeeUsd,
      includedFeatures: [...catalogOffer.includedFeatures],
      estimatedDelivery: catalogOffer.estimatedDelivery,
      ...(catalogOffer.includedVoiceMinutes !== undefined ? { includedVoiceMinutes: catalogOffer.includedVoiceMinutes } : {}),
      ...(catalogOffer.overageVoiceRateUsd !== undefined ? { overageVoiceRateUsd: catalogOffer.overageVoiceRateUsd } : {}),
      autonomousCloseAllowed: diagnosis.autonomousCloseAllowed,
      reason: diagnosis.recommendationReason,
    },
    opportunity: diagnosis.opportunityEstimate ?? null,
    nextAction,
    assumptionsToConfirm,
    disclosures: [
      "This is a preliminary Flight Plan based on the information provided so far. Scope, pricing, and delivery timing should be confirmed during onboarding before work begins.",
      "Opportunity estimates are based on information provided by the visitor and are not guarantees of revenue or ROI.",
      "Nova may only present approved Moonrock pricing and delivery estimates and cannot invent discounts, contract terms, integrations, or delivery promises.",
      ...(diagnosis.escalationReasons.length > 0 ? diagnosis.escalationReasons : []),
    ],
  };
}
