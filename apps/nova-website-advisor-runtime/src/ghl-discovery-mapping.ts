import type { DiagnosticInput, DiagnosticResult } from "./diagnostic-engine.js";
import type { FlightPlan } from "./flight-plan.js";

export interface GhlDiscoveryPayload {
  contactFields: Record<string, string | number | boolean>;
  opportunityFields: Record<string, string | number | boolean>;
  tags: string[];
  note: string;
}

export function mapDiscoveryToGhl(
  input: DiagnosticInput,
  diagnostic: DiagnosticResult,
  flightPlan: FlightPlan,
): GhlDiscoveryPayload {
  const contactFields: Record<string, string | number | boolean> = {
    moonrock_path: input.path,
    moonrock_recommended_offer: diagnostic.recommendedOfferId,
    moonrock_autonomous_close_allowed: diagnostic.autonomousCloseAllowed,
  };

  if (input.businessName) contactFields.business_name = input.businessName;
  if (input.industry) contactFields.industry = input.industry;
  if (input.monthlyLeads !== undefined) contactFields.monthly_leads = input.monthlyLeads;
  if (input.expectedVoiceMinutesPerMonth !== undefined) contactFields.expected_voice_minutes = input.expectedVoiceMinutesPerMonth;

  const opportunityFields: Record<string, string | number | boolean> = {
    moonrock_flight_plan_status: "generated",
    moonrock_primary_bottleneck: diagnostic.bottlenecks[0]?.id ?? "unknown",
    moonrock_bottleneck_count: diagnostic.bottlenecks.length,
  };

  if (diagnostic.opportunityEstimate) {
    opportunityFields.estimated_monthly_opportunity = diagnostic.opportunityEstimate.monthlyOpportunityUsd;
  }

  const tags = [
    "moonrock-2",
    `path-${input.path}`,
    `offer-${diagnostic.recommendedOfferId}`,
    diagnostic.autonomousCloseAllowed ? "nova-autonomous-close" : "nova-human-review",
  ];

  const note = [
    `Moonrock Flight Plan generated for ${flightPlan.businessName}.`,
    `Recommended offer: ${flightPlan.recommendedOffer.name}.`,
    `Primary bottlenecks: ${diagnostic.bottlenecks.slice(0, 3).map((finding) => finding.id).join(", ") || "none confirmed"}.`,
    diagnostic.opportunityEstimate
      ? `Estimated monthly opportunity: $${diagnostic.opportunityEstimate.monthlyOpportunityUsd}.`
      : "No revenue-opportunity estimate generated.",
    diagnostic.escalationReasons.length
      ? `Escalation: ${diagnostic.escalationReasons.join(" ")}`
      : "Standardized autonomous sales path eligible.",
  ].join(" ");

  return { contactFields, opportunityFields, tags, note };
}
