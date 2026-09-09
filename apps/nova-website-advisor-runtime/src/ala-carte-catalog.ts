export type AscensionTier = "trust_builder" | "ascension_addon" | "custom_build";

/**
 * Per-item execution-automation tag (Playbook Section 0 point 3 / Section 2's
 * 🟢/🟡/🔴 key) - independent of `ascensionTier`. `ascensionTier` reflects
 * the SALE'S checkpoint requirement (tier-level: e.g. every ascension_addon
 * item gets one setup checkpoint per Section 5.2's tier description); this
 * field reflects the item's own ONGOING delivery automation, which varies
 * item-by-item within a tier (Document Signing is zero_touch despite being
 * ascension_addon; Gray-Labeled Mobile App is async_human despite being
 * trust_builder) - see the per-row Automation column in Sections 5.1-5.3.
 */
export type AutomationTier = "zero_touch" | "async_human" | "delivery_human";

export type AlaCarteItemId =
  | "missed_call_textback"
  | "crm_pipeline"
  | "booking_appointments"
  | "call_tracking"
  | "reputation_management"
  | "surveys_forms"
  | "mobile_app"
  | "tracking_analytics"
  | "review_request_automation"
  | "quote_followup_sequences"
  | "appointment_reminders"
  | "seasonal_campaign_automation"
  | "workflow_automations"
  | "email_marketing"
  | "ai_content_chat"
  | "document_signing"
  | "seo_local_listings"
  | "unlimited_sales_funnels"
  | "ecommerce_addon"
  | "two_way_sms_marketing"
  | "ad_management"
  | "courses_products"
  | "communities";

export interface AlaCarteOffer {
  id: AlaCarteItemId;
  name: string;
  ascensionTier: AscensionTier;
  automationTier: AutomationTier;
  setupFeeUsd: number;
  monthlyFeeUsd: number;
  marketAlternative: string;
  requiresCrm: boolean;
  humanCheckpointRequired: boolean;
  includedFeatures: readonly string[];
  estimatedDelivery: string;
  /**
   * Internal-only. Set when this item functionally overlaps a GHL-native "AI
   * Employee" bundle component (Voice AI, Conversation AI, Reviews AI,
   * Content AI). Never surfaced to the customer or the LLM prompt - it exists
   * so this catalog's `name` fields never drift into Moonrock's reserved
   * "AI Employee" branding (that name is reserved for AI_EMPLOYEE_CATALOG).
   */
  ghlNativeComponentNote?: string;
}

export const ALA_CARTE_CATALOG: Readonly<Record<AlaCarteItemId, AlaCarteOffer>> = {
  missed_call_textback: {
    id: "missed_call_textback",
    name: "Missed-Call Text-Back",
    ascensionTier: "trust_builder",
    automationTier: "zero_touch",
    setupFeeUsd: 0,
    monthlyFeeUsd: 49,
    marketAlternative: "No direct one-to-one market equivalent",
    requiresCrm: true,
    humanCheckpointRequired: false,
    includedFeatures: ["Instant auto-text to any missed caller", "Catches the message - not a full call-handling replacement"],
    estimatedDelivery: "Same-day, self-serve setup",
  },
  crm_pipeline: {
    id: "crm_pipeline",
    name: "CRM & Pipeline Management",
    ascensionTier: "trust_builder",
    automationTier: "zero_touch",
    setupFeeUsd: 0,
    monthlyFeeUsd: 49,
    marketAlternative: "$99/mo (HubSpot/Salesforce)",
    requiresCrm: false,
    humanCheckpointRequired: false,
    includedFeatures: [
      "Centralized contact and pipeline tracking",
      "Foundation every other Moonrock automation attaches to",
    ],
    estimatedDelivery: "Same-day, self-serve setup",
  },
  booking_appointments: {
    id: "booking_appointments",
    name: "Booking & Appointments",
    ascensionTier: "trust_builder",
    automationTier: "zero_touch",
    setupFeeUsd: 0,
    monthlyFeeUsd: 29,
    marketAlternative: "$29/mo (Calendly)",
    requiresCrm: true,
    humanCheckpointRequired: false,
    includedFeatures: ["Online booking calendar", "Automated confirmation and reminders"],
    estimatedDelivery: "Same-day, self-serve setup",
  },
  call_tracking: {
    id: "call_tracking",
    name: "Call Tracking",
    ascensionTier: "trust_builder",
    automationTier: "zero_touch",
    setupFeeUsd: 0,
    monthlyFeeUsd: 29,
    marketAlternative: "$49/mo (CallRail)",
    requiresCrm: false,
    humanCheckpointRequired: false,
    includedFeatures: ["Call source tracking", "Call recording and logging"],
    estimatedDelivery: "Same-day, self-serve setup",
  },
  reputation_management: {
    id: "reputation_management",
    name: "Reputation Management",
    ascensionTier: "trust_builder",
    automationTier: "zero_touch",
    setupFeeUsd: 0,
    monthlyFeeUsd: 79,
    marketAlternative: "$159/mo (Birdeye/Podium)",
    requiresCrm: true,
    humanCheckpointRequired: false,
    includedFeatures: ["Automated review-request sending", "Central review monitoring"],
    estimatedDelivery: "Same-day, self-serve setup",
    ghlNativeComponentNote: "Overlaps GHL's native Reviews AI component - customer-facing name must never say 'AI Employee'.",
  },
  surveys_forms: {
    id: "surveys_forms",
    name: "Surveys & Forms",
    ascensionTier: "trust_builder",
    automationTier: "zero_touch",
    setupFeeUsd: 0,
    monthlyFeeUsd: 39,
    marketAlternative: "$79/mo (Jotform/Typeform)",
    requiresCrm: true,
    humanCheckpointRequired: false,
    includedFeatures: ["Custom form and survey builder", "Responses routed straight into the pipeline"],
    estimatedDelivery: "Same-day, self-serve setup",
  },
  mobile_app: {
    id: "mobile_app",
    name: "Gray-Labeled Mobile App",
    ascensionTier: "trust_builder",
    automationTier: "async_human",
    setupFeeUsd: 0,
    monthlyFeeUsd: 19,
    marketAlternative: "$49/mo",
    requiresCrm: false,
    humanCheckpointRequired: false,
    includedFeatures: ["Branded mobile app for managing leads and messages on the go"],
    estimatedDelivery: "Same-day, self-serve setup",
  },
  tracking_analytics: {
    id: "tracking_analytics",
    name: "Tracking & Analytics",
    ascensionTier: "trust_builder",
    automationTier: "zero_touch",
    setupFeeUsd: 0,
    monthlyFeeUsd: 19,
    marketAlternative: "$49/mo (Agency Analytics)",
    requiresCrm: false,
    humanCheckpointRequired: false,
    includedFeatures: ["Marketing and funnel performance dashboards"],
    estimatedDelivery: "Same-day, self-serve setup",
  },
  review_request_automation: {
    id: "review_request_automation",
    name: "Review Request Automation",
    ascensionTier: "ascension_addon",
    automationTier: "zero_touch",
    setupFeeUsd: 99,
    monthlyFeeUsd: 49,
    marketAlternative: "No direct one-to-one market equivalent",
    requiresCrm: true,
    humanCheckpointRequired: true,
    includedFeatures: ["Automated post-job review request sequence, reviewed once at setup"],
    estimatedDelivery: "3-5 business days, one setup checkpoint with a Moonrock human",
  },
  quote_followup_sequences: {
    id: "quote_followup_sequences",
    name: "Quote/Estimate Follow-Up Sequences",
    ascensionTier: "ascension_addon",
    automationTier: "zero_touch",
    setupFeeUsd: 99,
    monthlyFeeUsd: 49,
    marketAlternative: "No direct one-to-one market equivalent",
    requiresCrm: true,
    humanCheckpointRequired: true,
    includedFeatures: ["Automated follow-up sequence for outstanding quotes/estimates, reviewed once at setup"],
    estimatedDelivery: "3-5 business days, one setup checkpoint with a Moonrock human",
  },
  appointment_reminders: {
    id: "appointment_reminders",
    name: "Appointment Reminders / No-Show Reduction",
    ascensionTier: "ascension_addon",
    automationTier: "zero_touch",
    setupFeeUsd: 49,
    monthlyFeeUsd: 29,
    marketAlternative: "No direct one-to-one market equivalent",
    requiresCrm: true,
    humanCheckpointRequired: true,
    includedFeatures: ["Automated appointment reminder sequence tuned to reduce no-shows, reviewed once at setup"],
    estimatedDelivery: "3-5 business days, one setup checkpoint with a Moonrock human",
  },
  seasonal_campaign_automation: {
    id: "seasonal_campaign_automation",
    name: "Seasonal Campaign Automation",
    ascensionTier: "ascension_addon",
    automationTier: "zero_touch",
    setupFeeUsd: 149,
    monthlyFeeUsd: 79,
    marketAlternative: "No direct one-to-one market equivalent",
    requiresCrm: true,
    humanCheckpointRequired: true,
    includedFeatures: ["Recurring seasonal promotion campaigns, reviewed once at setup"],
    estimatedDelivery: "3-5 business days, one setup checkpoint with a Moonrock human",
  },
  workflow_automations: {
    id: "workflow_automations",
    name: "Workflow Automations",
    ascensionTier: "ascension_addon",
    automationTier: "async_human",
    setupFeeUsd: 149,
    monthlyFeeUsd: 69,
    marketAlternative: "$169/mo (Keap/ActiveCampaign)",
    requiresCrm: true,
    humanCheckpointRequired: true,
    includedFeatures: ["Custom automated workflows reviewed once at setup"],
    estimatedDelivery: "3-5 business days, one setup checkpoint with a Moonrock human",
  },
  email_marketing: {
    id: "email_marketing",
    name: "Email Marketing",
    ascensionTier: "ascension_addon",
    automationTier: "zero_touch",
    setupFeeUsd: 99,
    monthlyFeeUsd: 49,
    marketAlternative: "$99/mo (Mailchimp)",
    requiresCrm: true,
    humanCheckpointRequired: true,
    includedFeatures: ["Email campaign setup and templates reviewed once at setup"],
    estimatedDelivery: "3-5 business days, one setup checkpoint with a Moonrock human",
  },
  ai_content_chat: {
    id: "ai_content_chat",
    name: "Content & Chat Assistant",
    ascensionTier: "ascension_addon",
    automationTier: "zero_touch",
    setupFeeUsd: 149,
    monthlyFeeUsd: 79,
    marketAlternative: "$99/mo (Jasper/Drift)",
    requiresCrm: true,
    humanCheckpointRequired: true,
    includedFeatures: ["AI-drafted content and website chat responses reviewed once at setup"],
    estimatedDelivery: "3-5 business days, one setup checkpoint with a Moonrock human",
    ghlNativeComponentNote: "Overlaps GHL's native Conversation AI / Content AI components - customer-facing name must never say 'AI Employee'.",
  },
  document_signing: {
    id: "document_signing",
    name: "Document Signing",
    ascensionTier: "ascension_addon",
    automationTier: "zero_touch",
    setupFeeUsd: 49,
    monthlyFeeUsd: 29,
    marketAlternative: "$47/mo (DocuSign)",
    requiresCrm: false,
    humanCheckpointRequired: true,
    includedFeatures: ["E-signature request and tracking, reviewed once at setup"],
    estimatedDelivery: "3-5 business days, one setup checkpoint with a Moonrock human",
  },
  seo_local_listings: {
    id: "seo_local_listings",
    name: "SEO & Local Listings",
    ascensionTier: "ascension_addon",
    automationTier: "async_human",
    setupFeeUsd: 99,
    monthlyFeeUsd: 59,
    marketAlternative: "$99/mo (Yext/BrightLocal)",
    requiresCrm: false,
    humanCheckpointRequired: true,
    includedFeatures: ["Local listing management and on-page SEO, reviewed once at setup"],
    estimatedDelivery: "3-5 business days, one setup checkpoint with a Moonrock human",
  },
  unlimited_sales_funnels: {
    id: "unlimited_sales_funnels",
    name: "Unlimited Sales Funnels",
    ascensionTier: "custom_build",
    automationTier: "delivery_human",
    setupFeeUsd: 299,
    monthlyFeeUsd: 99,
    marketAlternative: "$297/mo (ClickFunnels)",
    requiresCrm: true,
    humanCheckpointRequired: true,
    includedFeatures: ["Custom-built sales funnel pages", "Ongoing funnel support"],
    estimatedDelivery: "10-15 business days, real human build work",
  },
  ecommerce_addon: {
    id: "ecommerce_addon",
    name: "Ecommerce",
    ascensionTier: "custom_build",
    automationTier: "delivery_human",
    setupFeeUsd: 499,
    monthlyFeeUsd: 49,
    marketAlternative: "$39/mo",
    requiresCrm: true,
    humanCheckpointRequired: true,
    includedFeatures: ["Storefront and checkout build", "Product catalog setup"],
    estimatedDelivery: "10-15 business days, real human build work",
  },
  two_way_sms_marketing: {
    id: "two_way_sms_marketing",
    name: "2-Way SMS Marketing",
    ascensionTier: "custom_build",
    automationTier: "async_human",
    setupFeeUsd: 199,
    monthlyFeeUsd: 69,
    marketAlternative: "$99/mo (Skipio/Podium)",
    requiresCrm: true,
    humanCheckpointRequired: true,
    includedFeatures: ["Two-way SMS campaign build and compliance setup"],
    estimatedDelivery: "10-15 business days, real human build work",
  },
  ad_management: {
    id: "ad_management",
    name: "Ad Management",
    ascensionTier: "custom_build",
    automationTier: "delivery_human",
    setupFeeUsd: 399,
    monthlyFeeUsd: 149,
    marketAlternative: "$49/mo (priced for ongoing strategy, not tool access)",
    requiresCrm: false,
    humanCheckpointRequired: true,
    includedFeatures: ["Ongoing ad campaign strategy and management by a Moonrock human"],
    estimatedDelivery: "10-15 business days, real human build work",
  },
  courses_products: {
    id: "courses_products",
    name: "Courses & Products",
    ascensionTier: "custom_build",
    automationTier: "delivery_human",
    setupFeeUsd: 299,
    monthlyFeeUsd: 39,
    marketAlternative: "$99/mo (Kajabi/Teachable)",
    requiresCrm: true,
    humanCheckpointRequired: true,
    includedFeatures: ["Course or digital product hosting and delivery build"],
    estimatedDelivery: "10-15 business days, real human build work",
  },
  communities: {
    id: "communities",
    name: "Communities",
    ascensionTier: "custom_build",
    automationTier: "delivery_human",
    setupFeeUsd: 249,
    monthlyFeeUsd: 39,
    marketAlternative: "$89/mo (Skool/Circle)",
    requiresCrm: true,
    humanCheckpointRequired: true,
    includedFeatures: ["Branded community space build and setup"],
    estimatedDelivery: "10-15 business days, real human build work",
  },
};
