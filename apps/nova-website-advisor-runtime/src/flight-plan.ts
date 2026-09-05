import { AI_EMPLOYEE_CATALOG, priceOffer, type AiEmployeeId } from "./ai-employee-catalog.js";
import type { AscensionBundle } from "./ascension-bundle.js";
import type { DiagnosticInput, DiagnosticResult } from "./diagnostic-engine.js";
import { evaluateFastTrack } from "./fast-track.js";

export interface FlightPlanCommercialOption {
  offerId: AiEmployeeId;
  offerName: string;
  setupFeeUsd: number;
  monthlyFeeUsd: number;
  includedFeatures: string[];
  estimatedDelivery: string;
  includedVoiceMinutes?: number;
  overageVoiceRateUsd?: number;
  reason: string;
}

export interface FlightPlan {
  version: "1.1";
  status: "preliminary" | "confirmed";
  businessPath: DiagnosticInput["path"];
  businessName: string | null;
  headline: string;
  primaryBottlenecks: Array<{ id: string; score: number; explanation: string }>;
  recommendation: FlightPlanCommercialOption & { autonomousCloseAllowed: boolean };
  recommendedAddOns: FlightPlanCommercialOption[];
  futureUpgrades: FlightPlanCommercialOption[];
  opportunity: DiagnosticResult["opportunityEstimate"] | null;
  nextAction: "purchase" | "human_review" | "continue_discovery";
  assumptionsToConfirm: string[];
  disclosures: string[];
  bundle?: AscensionBundle;
}

function commercialOption(id: AiEmployeeId, reason: string, foundingCustomer = false): FlightPlanCommercialOption {
  const catalog = AI_EMPLOYEE_CATALOG[id];
  const priced = priceOffer(id, { foundingCustomer });
  return {
    offerId: id,
    offerName: catalog.name,
    setupFeeUsd: priced.setupFeeUsd,
    monthlyFeeUsd: priced.monthlyFeeUsd,
    includedFeatures: [...catalog.includedFeatures],
    estimatedDelivery: catalog.estimatedDelivery,
    ...(catalog.includedVoiceMinutes !== undefined ? { includedVoiceMinutes: catalog.includedVoiceMinutes } : {}),
    ...(catalog.overageVoiceRateUsd !== undefined ? { overageVoiceRateUsd: catalog.overageVoiceRateUsd } : {}),
    reason,
  };
}

function evidenceBackedSecondaryOffers(diagnosis: DiagnosticResult): AiEmployeeId[] {
  const ids = new Set(diagnosis.bottlenecks.map((finding) => finding.id));
  const candidates: AiEmployeeId[] = [];
  if (ids.has("missed_calls") || ids.has("appointment_booking")) candidates.push("receptionist");
  if (ids.has("slow_lead_response") || ids.has("lead_capture") || ids.has("lead_qualification")) candidates.push("lead_response");
  if (ids.has("estimate_follow_up") || ids.has("reactivation")) candidates.push("sales_follow_up");
  if (ids.has("repetitive_support")) candidates.push("customer_care");
  if (ids.has("review_generation") || ids.has("retention")) candidates.push("reputation_retention");
  return [...new Set(candidates)].filter((id) => id !== diagnosis.recommendedOfferId);
}

export function buildFlightPlan(input: DiagnosticInput, diagnosis: DiagnosticResult, options: { foundingCustomer?: boolean; confirmed?: boolean; bundle?: AscensionBundle } = {}): FlightPlan {
  const catalogOffer = AI_EMPLOYEE_CATALOG[diagnosis.recommendedOfferId];
  const hasMeaningfulDiagnosis = diagnosis.bottlenecks.length > 0;
  const nextAction = !hasMeaningfulDiagnosis ? "continue_discovery" : diagnosis.autonomousCloseAllowed ? "purchase" : "human_review";
  const assumptionsToConfirm: string[] = [];
  if (input.monthlyLeads === undefined) assumptionsToConfirm.push("Typical lead/customer inquiry volume");
  if (input.requestedCustomIntegrations === undefined) assumptionsToConfirm.push("Any existing systems or integrations that need to be included");
  if (catalogOffer.includedVoiceMinutes !== undefined && input.expectedVoiceMinutesPerMonth === undefined) assumptionsToConfirm.push("Expected phone/voice usage and coverage pattern");
  if (input.path === "existing_business" && input.departmentsAffected === undefined) assumptionsToConfirm.push("Which business functions need to be included in the initial scope");
  if (input.path === "startup" && input.founderHandlesMostAdmin === undefined) assumptionsToConfirm.push("Who will own calls, follow-up, and customer administration at launch");

  const secondary = evidenceBackedSecondaryOffers(diagnosis);
  const recommendedAddOns = secondary.slice(0, 2).map((id) => commercialOption(id, `Recommended because discovery identified a related ${AI_EMPLOYEE_CATALOG[id].solves.find((signal) => diagnosis.bottlenecks.some((finding) => finding.id === signal))?.replaceAll("_", " ") ?? "operational"} bottleneck.`, Boolean(options.foundingCustomer)));

  const fastTrack = evaluateFastTrack(input, diagnosis.bottlenecks);
  const workforceUpgradeAlreadyEligible = diagnosis.recommendedOfferId !== "ai_workforce" && (input.departmentsAffected ?? 0) >= 2;
  const fastTrackWantsWorkforceUpgrade = diagnosis.recommendedOfferId !== "ai_workforce" && fastTrack.fastTrackEligible && fastTrack.targetTier === "ai_workforce";
  const futureUpgrades = workforceUpgradeAlreadyEligible || fastTrackWantsWorkforceUpgrade
    ? [commercialOption(
        "ai_workforce",
        fastTrackWantsWorkforceUpgrade && !workforceUpgradeAlreadyEligible
          ? `Future upgrade to consider: ${fastTrack.reasons.join(" ")}`
          : "Future upgrade to consider if the confirmed scope expands across multiple business functions or requires coordinated custom workflows.",
        Boolean(options.foundingCustomer),
      )]
    : [];

  return {
    version: "1.1",
    status: options.confirmed ? "confirmed" : "preliminary",
    businessPath: input.path,
    businessName: input.businessName ?? null,
    headline: input.path === "startup" ? "Your Preliminary Moonrock Startup Flight Plan" : "Your Preliminary Moonrock Growth Flight Plan",
    primaryBottlenecks: diagnosis.bottlenecks.slice(0, 3).map((finding) => ({ id: finding.id, score: finding.score, explanation: finding.reason })),
    recommendation: { ...commercialOption(diagnosis.recommendedOfferId, diagnosis.recommendationReason, Boolean(options.foundingCustomer)), autonomousCloseAllowed: diagnosis.autonomousCloseAllowed },
    recommendedAddOns,
    futureUpgrades,
    opportunity: diagnosis.opportunityEstimate ?? null,
    nextAction,
    assumptionsToConfirm,
    disclosures: [
      "This is a preliminary Flight Plan based on the information provided so far. Scope, pricing, and delivery timing should be confirmed during onboarding before work begins.",
      "All quoted offer names, included features, prices, voice allowances, overage rates, and delivery estimates come from Moonrock's canonical AI Employee catalog. Nova may select among documented offers but may not invent or alter commercial terms.",
      "Add-ons are only recommended when discovery findings support a documented secondary Moonrock offer. Unsupported or custom scope requires Moonrock review rather than an invented quote.",
      "Opportunity estimates are based on information provided by the visitor and are not guarantees of revenue or ROI.",
      ...(diagnosis.escalationReasons.length > 0 ? diagnosis.escalationReasons : []),
    ],
    ...(options.bundle ? { bundle: options.bundle } : {}),
  };
}
