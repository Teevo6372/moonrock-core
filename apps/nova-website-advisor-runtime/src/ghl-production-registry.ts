import type { GhlFieldRegistry } from "./ghl-field-registry.js";

export const MOONROCK_GHL_PIPELINE = {
  pipelineId: "dP2p5CjL8YowL3SKTlKL",
  pipelineName: "Pipeline",
  inboundLeadStageId: "eed97fc8-87c8-4c66-81a5-e625ea2419e1",
  inboundLeadStageName: "😃 Inbound Lead",
} as const;

export const MOONROCK_CONFIRMED_GHL_FIELDS = {
  contact: {
    path: "0r0NN3cha7lNFauM8B0s",
    businessName: "9QhB9KlcBlAVmUPh8k7R",
  },
} as const;

export const MOONROCK_PRODUCTION_GHL_FIELD_REGISTRY: GhlFieldRegistry = {
  contact: {
    path: "0r0NN3cha7lNFauM8B0s",
    recommendedOffer: "f99suFeJQk9gIqwLtboU",
    autonomousCloseAllowed: "xhokoSQR8bH8fRf7rWYC",
    businessName: "9QhB9KlcBlAVmUPh8k7R",
    industry: "sawfd5G93MRMFjg96RfZ",
    monthlyLeads: "NwYVzpLhCTHUDFBU2bFF",
    expectedVoiceMinutes: "lZYqPQI9BMUXfLAD4xAe",
  },
  opportunity: {
    flightPlanStatus: "cVaTeGYQsaGRgcUjRww9",
    primaryBottleneck: "o4NIIqzKkENbZoZiF2vS",
    bottleneckCount: "s1rrAe4WOthKI1bxxo9i",
    estimatedMonthlyOpportunity: "usvl3t6DzplG8njv766c",
  },
};

export const MOONROCK_GHL_FIELD_PROVISIONING = [
  { logicalKey: "contact.recommendedOffer", model: "contact", name: "Moonrock Recommended AI Employee", dataType: "TEXT", fieldKey: "contact.moonrock_recommended_offer" },
  { logicalKey: "contact.autonomousCloseAllowed", model: "contact", name: "Moonrock Autonomous Close Allowed", dataType: "TEXT", fieldKey: "contact.moonrock_autonomous_close_allowed" },
  { logicalKey: "contact.industry", model: "contact", name: "Moonrock Industry", dataType: "TEXT", fieldKey: "contact.moonrock_industry" },
  { logicalKey: "contact.monthlyLeads", model: "contact", name: "Moonrock Monthly Leads", dataType: "NUMERICAL", fieldKey: "contact.moonrock_monthly_leads" },
  { logicalKey: "contact.expectedVoiceMinutes", model: "contact", name: "Moonrock Expected Voice Minutes", dataType: "NUMERICAL", fieldKey: "contact.moonrock_expected_voice_minutes" },
  { logicalKey: "opportunity.flightPlanStatus", model: "opportunity", name: "Moonrock Flight Plan Status", dataType: "TEXT", fieldKey: "opportunity.moonrock_flight_plan_status" },
  { logicalKey: "opportunity.primaryBottleneck", model: "opportunity", name: "Moonrock Primary Bottleneck", dataType: "TEXT", fieldKey: "opportunity.moonrock_primary_bottleneck" },
  { logicalKey: "opportunity.bottleneckCount", model: "opportunity", name: "Moonrock Bottleneck Count", dataType: "NUMERICAL", fieldKey: "opportunity.moonrock_bottleneck_count" },
  { logicalKey: "opportunity.estimatedMonthlyOpportunity", model: "opportunity", name: "Moonrock Estimated Monthly Opportunity", dataType: "MONETORY", fieldKey: "opportunity.moonrock_estimated_monthly_opportunity" },
] as const;

export function buildMoonrockProductionFieldRegistry(
  resolved: Partial<GhlFieldRegistry> = {},
): GhlFieldRegistry {
  return {
    contact: {
      ...MOONROCK_PRODUCTION_GHL_FIELD_REGISTRY.contact,
      ...resolved.contact,
      path: MOONROCK_CONFIRMED_GHL_FIELDS.contact.path,
      businessName: MOONROCK_CONFIRMED_GHL_FIELDS.contact.businessName,
    },
    opportunity: {
      ...MOONROCK_PRODUCTION_GHL_FIELD_REGISTRY.opportunity,
      ...resolved.opportunity,
    },
  };
}
