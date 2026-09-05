import type { GhlFieldRegistry } from "./ghl-field-registry.js";
import type { HighLevelLocationInspection } from "./ghl-location-inspector.js";

export interface GhlRegistryResolution {
  registry: Partial<GhlFieldRegistry>;
  matched: Record<string, string>;
  missing: string[];
  verified: boolean;
}

const aliases: Record<string, string[]> = {
  "contact.path": [
    "moonrock_path",
    "contact.moonrock_path",
    "which_path_describes_you",
    "contact.which_path_describes_you",
    "which path describes you",
  ],
  "contact.recommendedOffer": [
    "moonrock_recommended_offer",
    "contact.moonrock_recommended_offer",
    "moonrock_recommended_ai_employee",
    "contact.moonrock_recommended_ai_employee",
  ],
  "contact.autonomousCloseAllowed": ["moonrock_autonomous_close_allowed", "contact.moonrock_autonomous_close_allowed"],
  "contact.businessName": ["business_name", "contact.business_name"],
  "contact.industry": ["moonrock_industry", "contact.moonrock_industry", "industry", "contact.industry"],
  "contact.monthlyLeads": ["moonrock_monthly_leads", "contact.moonrock_monthly_leads", "monthly_leads", "contact.monthly_leads"],
  "contact.expectedVoiceMinutes": ["moonrock_expected_voice_minutes", "contact.moonrock_expected_voice_minutes", "expected_voice_minutes", "contact.expected_voice_minutes"],
  "contact.ascensionScore": ["moonrock_ascension_score", "contact.moonrock_ascension_score"],
  "contact.currentTier": ["moonrock_current_tier", "contact.moonrock_current_tier"],
  "contact.lastOfferedTier": ["moonrock_last_offered_tier", "contact.moonrock_last_offered_tier"],
  "contact.lastEngagementAt": ["moonrock_last_engagement_at", "contact.moonrock_last_engagement_at"],
  "opportunity.flightPlanStatus": ["moonrock_flight_plan_status", "opportunity.moonrock_flight_plan_status"],
  "opportunity.primaryBottleneck": ["moonrock_primary_bottleneck", "opportunity.moonrock_primary_bottleneck"],
  "opportunity.bottleneckCount": ["moonrock_bottleneck_count", "opportunity.moonrock_bottleneck_count"],
  "opportunity.estimatedMonthlyOpportunity": ["moonrock_estimated_monthly_opportunity", "opportunity.moonrock_estimated_monthly_opportunity", "estimated_monthly_opportunity", "opportunity.estimated_monthly_opportunity"],
};

export function resolveGhlFieldRegistry(inspection: HighLevelLocationInspection): GhlRegistryResolution {
  const matched: Record<string, string> = {};
  const missing: string[] = [];
  for (const [logical, candidates] of Object.entries(aliases)) {
    const field = inspection.customFields.find((item) => candidates.some((candidate) => normalize(item.fieldKey) === normalize(candidate) || normalize(item.name) === normalize(candidate)));
    if (field) matched[logical] = field.id;
    else missing.push(logical);
  }
  const contact = Object.fromEntries(Object.entries(matched).filter(([key]) => key.startsWith("contact.")).map(([key, value]) => [key.split(".")[1], value]));
  const opportunity = Object.fromEntries(Object.entries(matched).filter(([key]) => key.startsWith("opportunity.")).map(([key, value]) => [key.split(".")[1], value]));
  return {
    registry: {
      ...(Object.keys(contact).length ? { contact: contact as GhlFieldRegistry["contact"] } : {}),
      ...(Object.keys(opportunity).length ? { opportunity: opportunity as GhlFieldRegistry["opportunity"] } : {}),
    },
    matched,
    missing,
    verified: missing.length === 0,
  };
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
