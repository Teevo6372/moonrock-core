import type { DiagnosticInput, DiagnosticResult } from "./diagnostic-engine.js";
import type { FlightPlan } from "./flight-plan.js";
import { DEFAULT_GHL_FIELD_REGISTRY, type GhlFieldRegistry } from "./ghl-field-registry.js";

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
  fields: GhlFieldRegistry = DEFAULT_GHL_FIELD_REGISTRY,
): GhlDiscoveryPayload {
  const contactFields: Record<string, string | number | boolean> = {
    [fields.contact.path]: input.path,
    [fields.contact.recommendedOffer]: diagnostic.recommendedOfferId,
    [fields.contact.autonomousCloseAllowed]: diagnostic.autonomousCloseAllowed,
  };

  if (input.businessName) contactFields[fields.contact.businessName] = input.businessName;
  if (input.industry) contactFields[fields.contact.industry] = input.industry;
  if (input.monthlyLeads !== undefined) contactFields[fields.contact.monthlyLeads] = input.monthlyLeads;
  if (input.expectedVoiceMinutesPerMonth !== undefined) contactFields[fields.contact.expectedVoiceMinutes] = input.expectedVoiceMinutesPerMonth;

  const opportunityFields: Record<string, string | number | boolean> = {
    [fields.opportunity.flightPlanStatus]: "generated",
    [fields.opportunity.primaryBottleneck]: diagnostic.bottlenecks[0]?.id ?? "unknown",
    [fields.opportunity.bottleneckCount]: diagnostic.bottlenecks.length,
  };

  if (diagnostic.opportunityEstimate) {
    opportunityFields[fields.opportunity.estimatedMonthlyOpportunity] = diagnostic.opportunityEstimate.monthlyOpportunityUsd;
  }

  const tags = [
    "moonrock-2",
    `path-${input.path}`,
    `offer-${diagnostic.recommendedOfferId}`,
    diagnostic.autonomousCloseAllowed ? "nova-autonomous-close" : "nova-human-review",
  ];

  const note = [
    `Moonrock Flight Plan generated for ${flightPlan.businessName}.`,
    `Recommended offer: ${flightPlan.recommendation.offerName}.`,
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
