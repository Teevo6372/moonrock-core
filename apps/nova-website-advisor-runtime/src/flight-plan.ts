import { AI_EMPLOYEE_CATALOG, priceOffer } from "./ai-employee-catalog.js";
import type { DiagnosticInput, DiagnosticResult } from "./diagnostic-engine.js";

export interface FlightPlan {
  version: "1.0";
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
    autonomousCloseAllowed: boolean;
    reason: string;
  };
  opportunity: DiagnosticResult["opportunityEstimate"] | null;
  nextAction: "purchase" | "human_review" | "continue_discovery";
  disclosures: string[];
}

export function buildFlightPlan(
  input: DiagnosticInput,
  diagnosis: DiagnosticResult,
  options: { foundingCustomer?: boolean } = {},
): FlightPlan {
  const pricedOffer = priceOffer(diagnosis.recommendedOfferId, options);
  const catalogOffer = AI_EMPLOYEE_CATALOG[diagnosis.recommendedOfferId];
  const hasMeaningfulDiagnosis = diagnosis.bottlenecks.length > 0;
  const nextAction = !hasMeaningfulDiagnosis
    ? "continue_discovery"
    : diagnosis.autonomousCloseAllowed
      ? "purchase"
      : "human_review";

  return {
    version: "1.0",
    businessPath: input.path,
    businessName: input.businessName ?? null,
    headline: input.path === "startup"
      ? "Your Moonrock Startup Flight Plan"
      : "Your Moonrock Growth Flight Plan",
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
      autonomousCloseAllowed: diagnosis.autonomousCloseAllowed,
      reason: diagnosis.recommendationReason,
    },
    opportunity: diagnosis.opportunityEstimate ?? null,
    nextAction,
    disclosures: [
      "Opportunity estimates are based on information provided by the visitor and are not guarantees of revenue or ROI.",
      "Nova may only present approved Moonrock pricing and cannot invent discounts, contract terms, integrations, or delivery promises.",
      ...(diagnosis.escalationReasons.length > 0 ? diagnosis.escalationReasons : []),
    ],
  };
}
