export interface GhlFieldRegistry {
  contact: {
    path: string;
    recommendedOffer: string;
    autonomousCloseAllowed: string;
    businessName: string;
    industry: string;
    monthlyLeads: string;
    expectedVoiceMinutes: string;
  };
  opportunity: {
    flightPlanStatus: string;
    primaryBottleneck: string;
    bottleneckCount: string;
    estimatedMonthlyOpportunity: string;
  };
}

/**
 * Logical defaults used by local/staging environments. Production should
 * override these with the real HighLevel custom-field IDs after the Moonrock
 * location is inspected. Keeping IDs out of source prevents coupling Nova's
 * domain model to one GHL account.
 */
export const DEFAULT_GHL_FIELD_REGISTRY: GhlFieldRegistry = {
  contact: {
    path: "moonrock_path",
    recommendedOffer: "moonrock_recommended_offer",
    autonomousCloseAllowed: "moonrock_autonomous_close_allowed",
    businessName: "business_name",
    industry: "industry",
    monthlyLeads: "monthly_leads",
    expectedVoiceMinutes: "expected_voice_minutes",
  },
  opportunity: {
    flightPlanStatus: "moonrock_flight_plan_status",
    primaryBottleneck: "moonrock_primary_bottleneck",
    bottleneckCount: "moonrock_bottleneck_count",
    estimatedMonthlyOpportunity: "estimated_monthly_opportunity",
  },
};
