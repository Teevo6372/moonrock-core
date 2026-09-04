export type AiEmployeeId =
  | "reputation_retention"
  | "lead_response"
  | "customer_care"
  | "receptionist"
  | "sales_follow_up"
  | "front_office"
  | "ai_workforce";

export interface AiEmployeeOffer {
  id: AiEmployeeId;
  name: string;
  setupFeeUsd: number;
  monthlyFeeUsd: number;
  includedVoiceMinutes?: number;
  overageVoiceRateUsd?: number;
  autonomousSaleAllowed: boolean;
  foundingCustomerSetupFeeUsd?: number;
  solves: readonly string[];
  includedFeatures: readonly string[];
  estimatedDelivery: string;
}

export const AI_EMPLOYEE_CATALOG: Readonly<Record<AiEmployeeId, AiEmployeeOffer>> = {
  reputation_retention: {
    id: "reputation_retention",
    name: "AI Reputation & Retention Agent",
    setupFeeUsd: 199,
    monthlyFeeUsd: 149,
    autonomousSaleAllowed: true,
    foundingCustomerSetupFeeUsd: 100,
    solves: ["review_generation", "retention", "reactivation"],
    includedFeatures: [
      "Automated review-request follow-up",
      "Past-customer and dormant-lead re-engagement",
      "Routine customer follow-up workflows",
      "Monitoring and escalation when a human should step in",
    ],
    estimatedDelivery: "About 3–5 business days after onboarding details are confirmed",
  },
  lead_response: {
    id: "lead_response",
    name: "AI Lead Response Agent",
    setupFeeUsd: 299,
    monthlyFeeUsd: 199,
    autonomousSaleAllowed: true,
    foundingCustomerSetupFeeUsd: 150,
    solves: ["slow_lead_response", "lead_capture", "lead_qualification"],
    includedFeatures: [
      "Immediate lead acknowledgement and capture",
      "Basic lead qualification and routing",
      "Automated follow-up for unanswered opportunities",
      "Human escalation for exceptions and sales-ready conversations",
    ],
    estimatedDelivery: "About 3–5 business days after onboarding details are confirmed",
  },
  customer_care: {
    id: "customer_care",
    name: "AI Customer Care Agent",
    setupFeeUsd: 299,
    monthlyFeeUsd: 199,
    autonomousSaleAllowed: true,
    foundingCustomerSetupFeeUsd: 150,
    solves: ["repetitive_support", "service_intake", "customer_questions"],
    includedFeatures: [
      "Routine customer-question handling",
      "Customer and service-request intake",
      "Consistent responses based on approved business information",
      "Human escalation when judgment or special handling is needed",
    ],
    estimatedDelivery: "About 3–5 business days after onboarding details are confirmed",
  },
  receptionist: {
    id: "receptionist",
    name: "AI Receptionist",
    setupFeeUsd: 399,
    monthlyFeeUsd: 249,
    includedVoiceMinutes: 300,
    overageVoiceRateUsd: 0.25,
    autonomousSaleAllowed: true,
    foundingCustomerSetupFeeUsd: 200,
    solves: ["missed_calls", "call_qualification", "appointment_booking"],
    includedFeatures: [
      "AI phone answering and routine caller assistance",
      "Call and customer-intent capture",
      "Basic qualification and appointment-routing support",
      "300 included voice minutes per month",
      "Human escalation for calls that need a person",
    ],
    estimatedDelivery: "About 4–7 business days after onboarding details are confirmed",
  },
  sales_follow_up: {
    id: "sales_follow_up",
    name: "AI Sales & Follow-Up Agent",
    setupFeeUsd: 499,
    monthlyFeeUsd: 299,
    autonomousSaleAllowed: true,
    foundingCustomerSetupFeeUsd: 250,
    solves: ["estimate_follow_up", "lead_nurture", "reactivation"],
    includedFeatures: [
      "Lead and estimate follow-up workflows",
      "Lead nurture and re-engagement",
      "Monitoring for stalled opportunities",
      "Sales-ready escalation to a human",
    ],
    estimatedDelivery: "About 4–7 business days after onboarding details are confirmed",
  },
  front_office: {
    id: "front_office",
    name: "Moonrock AI Front Office",
    setupFeeUsd: 799,
    monthlyFeeUsd: 499,
    includedVoiceMinutes: 500,
    overageVoiceRateUsd: 0.25,
    autonomousSaleAllowed: true,
    foundingCustomerSetupFeeUsd: 399,
    solves: [
      "missed_calls",
      "slow_lead_response",
      "lead_capture",
      "lead_qualification",
      "appointment_booking",
      "estimate_follow_up",
    ],
    includedFeatures: [
      "AI phone and digital lead response",
      "Lead capture, qualification, and routing",
      "Appointment and follow-up workflow support",
      "Monitoring for missed or stalled opportunities",
      "500 included voice minutes per month",
      "Human escalation and exception handling",
    ],
    estimatedDelivery: "About 5–10 business days after onboarding details are confirmed",
  },
  ai_workforce: {
    id: "ai_workforce",
    name: "Moonrock AI Workforce",
    setupFeeUsd: 1499,
    monthlyFeeUsd: 749,
    autonomousSaleAllowed: false,
    solves: ["multi_department", "complex_operations", "custom_workflows"],
    includedFeatures: [
      "Coordinated AI support across multiple business functions",
      "Custom workflow automation and monitoring",
      "Cross-functional lead/customer routing",
      "Human escalation and exception handling",
      "Implementation planning for approved integrations and operating rules",
    ],
    estimatedDelivery: "About 7–14 business days after scope and onboarding details are confirmed",
  },
};

export const FOUNDING_CUSTOMER_LIMIT = 10;

export function priceOffer(
  id: AiEmployeeId,
  options: { foundingCustomer?: boolean } = {},
): AiEmployeeOffer {
  const offer = AI_EMPLOYEE_CATALOG[id];
  if (!options.foundingCustomer || offer.foundingCustomerSetupFeeUsd === undefined) {
    return offer;
  }

  return {
    ...offer,
    setupFeeUsd: offer.foundingCustomerSetupFeeUsd,
  };
}

// ---------------------------------------------------------------------------
// Service tiers beyond AI Employee. Additive only: nothing above this line
// changes for the ai_employee tier. Digital Products is intentionally not
// modeled yet (catalog inventory is unvetted); ServiceTier and the
// classify/dispatch pattern in diagnostic-engine.ts are built so it can be
// added as a fourth tier later without disruption.
// ---------------------------------------------------------------------------

export type ServiceTier = "ai_employee" | "website_build" | "ghl_saas";

export type WebsiteBuildId = "starter_site" | "growth_site" | "custom_site";

export interface WebsiteBuildOffer {
  id: WebsiteBuildId;
  name: string;
  setupFeeUsd: number;
  scopeDescription: string;
  estimatedDelivery: string;
  componentLibraryTier: "standard" | "custom";
}

export const WEBSITE_BUILD_CATALOG: Readonly<Record<WebsiteBuildId, WebsiteBuildOffer>> = {
  starter_site: {
    id: "starter_site",
    name: "Starter Site",
    setupFeeUsd: 500,
    scopeDescription: "Single-page/brochure site, up to 5 sections, built from Moonrock's standard component library.",
    estimatedDelivery: "About 5–7 business days after the brief is confirmed",
    componentLibraryTier: "standard",
  },
  growth_site: {
    id: "growth_site",
    name: "Growth Site",
    setupFeeUsd: 1200,
    scopeDescription: "Multi-page site (5–10 pages) with a structured business-data model and booking/contact integration.",
    estimatedDelivery: "About 7–12 business days after the brief is confirmed",
    componentLibraryTier: "standard",
  },
  custom_site: {
    id: "custom_site",
    name: "Custom Site",
    setupFeeUsd: 2500,
    scopeDescription: "Larger multi-page site with custom sections or integrations beyond the standard component library.",
    estimatedDelivery: "About 10–15 business days after the brief is confirmed",
    componentLibraryTier: "custom",
  },
};

export type GhlSaasId = "saas_starter" | "saas_growth" | "saas_pro";

export interface GhlSaasOffer {
  id: GhlSaasId;
  name: string;
  monthlyFeeUsd: number;
  includedSeats: number;
  includedFeatures: readonly string[];
}

export const GHL_SAAS_CATALOG: Readonly<Record<GhlSaasId, GhlSaasOffer>> = {
  saas_starter: {
    id: "saas_starter",
    name: "SaaS Starter",
    monthlyFeeUsd: 97,
    includedSeats: 1,
    includedFeatures: [
      "White-labeled GHL sub-account provisioned under your brand",
      "Core CRM and pipeline features for your own client base",
    ],
  },
  saas_growth: {
    id: "saas_growth",
    name: "SaaS Growth",
    monthlyFeeUsd: 197,
    includedSeats: 3,
    includedFeatures: [
      "Everything in SaaS Starter",
      "Automation and workflow templates",
      "Additional user seats",
    ],
  },
  saas_pro: {
    id: "saas_pro",
    name: "SaaS Pro",
    monthlyFeeUsd: 297,
    includedSeats: 10,
    includedFeatures: [
      "Everything in SaaS Growth",
      "Full white-label branding",
      "Highest usage limits and priority provisioning",
    ],
  },
};
