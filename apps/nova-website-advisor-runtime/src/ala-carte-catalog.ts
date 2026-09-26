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
  | "communities"
  // Launch add-ons — ungated (Phase 2)
  | "review_response_autopilot"
  | "referral_engine"
  | "gbp_autopilot"
  | "reactivation_newsletter"
  | "monthly_scorecard"
  // Launch add-ons — gated (Phase 2, enabled via LAUNCH_ADDON_ENABLED config)
  | "social_content_autopilot"
  | "local_seo_page_pack"
  | "website_care_plan";

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
  /**
   * True when a client-side approval step replaces the old Moonrock-human
   * checkpoint. When true, `humanCheckpointRequired` must be false. Both false
   * means the item is fully zero-touch (no approval step from anyone).
   */
  clientApprovalRequired: boolean;
  /**
   * False hides the item from Nova's pitch list and approvedServiceCatalog().
   * The catalog entry is kept intact so existing type references, the CRM
   * auto-attach rule, and the fast-track opening-offer reference don't break.
   * Flip to true when the item is ready to sell again.
   */
  sellable: boolean;
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
  // ---------------------------------------------------------------------------
  // LAUNCH PLAN DUPLICATES — sellable: false
  // These items are included in the Launch Plan ($97/mo) and must never be
  // pitched as separate add-ons to Launch customers.
  // The catalog entries are kept (not hard-deleted) because ascension-bundle.ts
  // auto-attach logic and fast-track.ts reference crm_pipeline by ID.
  // ---------------------------------------------------------------------------
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
    clientApprovalRequired: false,
    sellable: false, // included in Launch Plan
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
    clientApprovalRequired: false,
    sellable: false, // included in Launch Plan; also used as CRM auto-attach anchor in ascension-bundle.ts
    includedFeatures: [
      "Centralized contact and pipeline tracking",
      "Foundation every other Moonrock automation attaches to",
    ],
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
    clientApprovalRequired: false,
    sellable: false, // review-request sending duplicates Launch Plan; monitoring folds into review_response_autopilot
    includedFeatures: ["Automated review-request sending", "Central review monitoring"],
    estimatedDelivery: "Same-day, self-serve setup",
    ghlNativeComponentNote: "Overlaps GHL's native Reviews AI component - customer-facing name must never say 'AI Employee'.",
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
    clientApprovalRequired: false,
    sellable: false, // duplicates Launch Plan's automatic review requests
    includedFeatures: ["Automated post-job review request sequence, reviewed once at setup"],
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
    clientApprovalRequired: false,
    sellable: false, // folds into booking_appointments confirmations/reminders (included in Launch Plan)
    includedFeatures: ["Automated appointment reminder sequence tuned to reduce no-shows, reviewed once at setup"],
    estimatedDelivery: "3-5 business days, one setup checkpoint with a Moonrock human",
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
    clientApprovalRequired: false,
    sellable: false, // replaced by monthly_scorecard (Nova Monthly Scorecard)
    includedFeatures: ["Marketing and funnel performance dashboards"],
    estimatedDelivery: "Same-day, self-serve setup",
  },

  // ---------------------------------------------------------------------------
  // TRUST BUILDER — sellable, no setup fee, zero-touch
  // ---------------------------------------------------------------------------
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
    clientApprovalRequired: false,
    sellable: true,
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
    clientApprovalRequired: false,
    sellable: true,
    includedFeatures: ["Call source tracking", "Call recording and logging"],
    estimatedDelivery: "Same-day, self-serve setup",
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
    clientApprovalRequired: false,
    sellable: true,
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
    clientApprovalRequired: false,
    sellable: true,
    includedFeatures: ["Branded mobile app for managing leads and messages on the go"],
    estimatedDelivery: "Same-day, self-serve setup",
  },

  // ---------------------------------------------------------------------------
  // ASCENSION ADD-ONS — converted to zero-touch (no Moonrock human in delivery)
  // ---------------------------------------------------------------------------
  quote_followup_sequences: {
    id: "quote_followup_sequences",
    name: "Quote & Estimate Follow-Up",
    ascensionTier: "ascension_addon",
    automationTier: "zero_touch",
    setupFeeUsd: 0,
    monthlyFeeUsd: 49,
    marketAlternative: "No direct one-to-one market equivalent",
    requiresCrm: true,
    humanCheckpointRequired: false,
    clientApprovalRequired: true, // client approves message templates before sequences go live
    sellable: true,
    includedFeatures: [
      "Automated follow-up sequences for outstanding quotes and estimates",
      "Client approves message templates once before activation",
    ],
    estimatedDelivery: "Same-day activation after client approves message templates",
  },
  seasonal_campaign_automation: {
    id: "seasonal_campaign_automation",
    name: "Seasonal Campaign Autopilot",
    ascensionTier: "ascension_addon",
    automationTier: "zero_touch",
    setupFeeUsd: 0,
    monthlyFeeUsd: 59,
    marketAlternative: "No direct one-to-one market equivalent",
    requiresCrm: true,
    humanCheckpointRequired: false,
    clientApprovalRequired: true, // client approves each campaign before it runs
    sellable: true,
    includedFeatures: [
      "Recurring seasonal promotion campaigns (e.g. spring tune-up, holiday special)",
      "Client approves each campaign before launch",
    ],
    estimatedDelivery: "Same-day activation after client approves the first campaign",
  },
  document_signing: {
    id: "document_signing",
    name: "Document Signing",
    ascensionTier: "ascension_addon",
    automationTier: "zero_touch",
    setupFeeUsd: 0,
    monthlyFeeUsd: 29,
    marketAlternative: "$47/mo (DocuSign)",
    requiresCrm: false,
    humanCheckpointRequired: false,
    clientApprovalRequired: false,
    sellable: true,
    includedFeatures: ["E-signature request and tracking"],
    estimatedDelivery: "Same-day, self-serve setup",
  },

  // ---------------------------------------------------------------------------
  // ASCENSION ADD-ONS — legacy human-checkpoint items (unchanged)
  // ---------------------------------------------------------------------------
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
    clientApprovalRequired: false,
    sellable: true,
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
    clientApprovalRequired: false,
    sellable: true,
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
    clientApprovalRequired: false,
    sellable: true,
    includedFeatures: ["AI-drafted content and website chat responses reviewed once at setup"],
    estimatedDelivery: "3-5 business days, one setup checkpoint with a Moonrock human",
    ghlNativeComponentNote: "Overlaps GHL's native Conversation AI / Content AI components - customer-facing name must never say 'AI Employee'.",
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
    clientApprovalRequired: false,
    sellable: true,
    includedFeatures: ["Local listing management and on-page SEO, reviewed once at setup"],
    estimatedDelivery: "3-5 business days, one setup checkpoint with a Moonrock human",
  },

  // ---------------------------------------------------------------------------
  // CUSTOM BUILD — real human work, unchanged
  // ---------------------------------------------------------------------------
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
    clientApprovalRequired: false,
    sellable: true,
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
    clientApprovalRequired: false,
    sellable: true,
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
    clientApprovalRequired: false,
    sellable: true,
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
    clientApprovalRequired: false,
    sellable: true,
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
    clientApprovalRequired: false,
    sellable: true,
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
    clientApprovalRequired: false,
    sellable: true,
    includedFeatures: ["Branded community space build and setup"],
    estimatedDelivery: "10-15 business days, real human build work",
  },

  // ---------------------------------------------------------------------------
  // LAUNCH ADD-ONS — ungated, zero-touch, sellable
  // ---------------------------------------------------------------------------
  review_response_autopilot: {
    id: "review_response_autopilot",
    name: "Review Response Autopilot",
    ascensionTier: "ascension_addon",
    automationTier: "zero_touch",
    setupFeeUsd: 0,
    monthlyFeeUsd: 29,
    marketAlternative: "No direct one-to-one market equivalent",
    requiresCrm: false,
    humanCheckpointRequired: false,
    clientApprovalRequired: true, // 3-star and below reviews held for one-tap owner approval before posting
    sellable: true,
    includedFeatures: [
      "Nova drafts and posts replies to new Google reviews in the client's voice",
      "4-5 star replies auto-post",
      "3 stars and below held for one-tap owner approval — never auto-posted",
      "Legal or dispute language flagged to the owner only",
    ],
    estimatedDelivery: "Same-day activation after Google Business Profile access is granted",
    ghlNativeComponentNote: "Overlaps GHL's native Reviews AI component - customer-facing name must never say 'AI Employee'.",
  },
  referral_engine: {
    id: "referral_engine",
    name: "Referral Engine",
    ascensionTier: "ascension_addon",
    automationTier: "zero_touch",
    setupFeeUsd: 0,
    monthlyFeeUsd: 29,
    marketAlternative: "No direct one-to-one market equivalent",
    requiresCrm: true,
    humanCheckpointRequired: false,
    clientApprovalRequired: false,
    sellable: true,
    includedFeatures: [
      "After a 5-star review or completed job, Nova texts the customer a referral link and offer",
      "Referred leads tracked in the pipeline",
      "Client sets the referral reward once during onboarding",
      "Existing customers only — always includes opt-out",
    ],
    estimatedDelivery: "Same-day activation after onboarding conversation sets the referral reward",
  },
  gbp_autopilot: {
    id: "gbp_autopilot",
    name: "Google Business Profile Autopilot",
    ascensionTier: "ascension_addon",
    automationTier: "zero_touch",
    setupFeeUsd: 49,
    monthlyFeeUsd: 39,
    marketAlternative: "No direct one-to-one market equivalent",
    requiresCrm: false,
    humanCheckpointRequired: false,
    clientApprovalRequired: false,
    sellable: true,
    includedFeatures: [
      "Weekly Google Business Profile posts from client photos and business updates",
      "Hours and holiday sync",
      "Q&A seeding",
      "Monthly listing-consistency check",
    ],
    estimatedDelivery: "Same-day activation after Google Business Profile access is granted",
  },
  reactivation_newsletter: {
    id: "reactivation_newsletter",
    name: "Customer Reactivation & Newsletter",
    ascensionTier: "ascension_addon",
    automationTier: "zero_touch",
    setupFeeUsd: 0,
    monthlyFeeUsd: 49,
    marketAlternative: "No direct one-to-one market equivalent",
    requiresCrm: true,
    humanCheckpointRequired: false,
    clientApprovalRequired: true, // client uploads list with consent attestation; Nova QA-gates opt-out language before every send
    sellable: true,
    includedFeatures: [
      "Monthly email (and SMS where consent exists) to past customers and dormant leads",
      "Client uploads contact list once with a consent attestation",
      "Nova QA gate checks opt-out language before every send",
    ],
    estimatedDelivery: "Same-day activation after client uploads the contact list",
  },
  monthly_scorecard: {
    id: "monthly_scorecard",
    name: "Nova Monthly Scorecard",
    ascensionTier: "ascension_addon",
    automationTier: "zero_touch",
    setupFeeUsd: 0,
    monthlyFeeUsd: 19,
    marketAlternative: "No direct one-to-one market equivalent",
    requiresCrm: false,
    humanCheckpointRequired: false,
    clientApprovalRequired: false,
    sellable: true,
    includedFeatures: [
      "Nova-written monthly summary: calls, missed calls recovered, leads, bookings, reviews gained",
      "3 recommended actions each month",
      "Each recommendation is a one-tap 'turn this on' so the scorecard drives add-on adoption",
    ],
    estimatedDelivery: "First scorecard delivered at the end of the first full calendar month",
  },

  // ---------------------------------------------------------------------------
  // LAUNCH ADD-ONS — gated (sellable: false until config flag is enabled)
  // social_content_autopilot: waiting on Higgsfield vs GHL AI Studio decision
  // local_seo_page_pack: waiting on per-client website architecture decision
  // website_care_plan: waiting on architecture decision + Launch hosting/edit scope confirmation
  // ---------------------------------------------------------------------------
  social_content_autopilot: {
    id: "social_content_autopilot",
    name: "Social Content Autopilot",
    ascensionTier: "ascension_addon",
    automationTier: "zero_touch",
    setupFeeUsd: 0,
    monthlyFeeUsd: 49,
    marketAlternative: "No direct one-to-one market equivalent",
    requiresCrm: false,
    humanCheckpointRequired: false,
    clientApprovalRequired: true, // client approves posts for first 30 days; can switch to auto-publish after
    sellable: false, // GATED: waiting on Higgsfield vs GHL AI Studio decision
    includedFeatures: [
      "Weekly Facebook and Instagram posts built from job photos and business data",
      "Client approves posts for the first 30 days, then can switch to auto-publish",
    ],
    estimatedDelivery: "Same-day activation after social accounts are connected",
    ghlNativeComponentNote: "Overlaps GHL's native Content AI component - customer-facing name must never say 'AI Employee'.",
  },
  local_seo_page_pack: {
    id: "local_seo_page_pack",
    name: "Local SEO Page Pack",
    ascensionTier: "ascension_addon",
    automationTier: "zero_touch",
    setupFeeUsd: 0,
    monthlyFeeUsd: 69,
    marketAlternative: "No direct one-to-one market equivalent",
    requiresCrm: false,
    humanCheckpointRequired: false,
    clientApprovalRequired: true, // client approves preview before each page is published
    sellable: false, // GATED: waiting on per-client website architecture decision
    includedFeatures: [
      "Nova writes and ships service and service-area pages (up to 3 per month)",
      "Built through the GitHub → Vite → Cloudflare pipeline",
      "Preview link sent to client for approval before publish",
      "Local facts only — no invented licenses, warranties, or prices",
    ],
    estimatedDelivery: "First page delivered within 5 business days of activation",
  },
  website_care_plan: {
    id: "website_care_plan",
    name: "Website Care Plan",
    ascensionTier: "ascension_addon",
    automationTier: "zero_touch",
    setupFeeUsd: 0,
    monthlyFeeUsd: 39,
    marketAlternative: "No direct one-to-one market equivalent",
    requiresCrm: false,
    humanCheckpointRequired: false,
    clientApprovalRequired: true, // preview → client approves → publish
    sellable: false, // GATED: waiting on per-client website architecture decision + Launch hosting/edit scope confirmation
    includedFeatures: [
      "Uptime monitoring",
      "Up to 3 chat-based change requests per month (hours, photos, text, prices)",
      "Preview → client approves → publish flow",
      "Additional changes at $15 each; structural changes route to Website Build pricing",
    ],
    estimatedDelivery: "Same-day activation",
  },
};

/** Returns only catalog items that are currently sellable. Used by Nova's grounding data and add-on pitch logic. */
export function sellableAlaCarteItems(): AlaCarteOffer[] {
  return Object.values(ALA_CARTE_CATALOG).filter((offer) => offer.sellable);
}

/**
 * The Launch order-bump add-ons (the "LAUNCH ADD-ONS" sections above). This is
 * the only list Stripe provisioning and Launch checkout may draw from -
 * sellableAlaCarteItems() also returns the older human-checkpoint items, which
 * are not order-bump add-ons. Sellability is never copied here: filter through
 * isSellableLaunchAddonId() / sellableLaunchAddonItems() so a gated item is
 * blocked by its `sellable: false` flag alone.
 */
export const LAUNCH_ADDON_ITEM_IDS = [
  "review_response_autopilot",
  "referral_engine",
  "gbp_autopilot",
  "reactivation_newsletter",
  "monthly_scorecard",
  "social_content_autopilot",
  "local_seo_page_pack",
  "website_care_plan",
] as const satisfies readonly AlaCarteItemId[];

export type LaunchAddonItemId = (typeof LAUNCH_ADDON_ITEM_IDS)[number];

const LAUNCH_ADDON_ID_SET: ReadonlySet<string> = new Set(LAUNCH_ADDON_ITEM_IDS);

/** True only for a known Launch add-on id whose catalog entry is currently sellable. */
export function isSellableLaunchAddonId(id: string): id is LaunchAddonItemId {
  return LAUNCH_ADDON_ID_SET.has(id) && ALA_CARTE_CATALOG[id as LaunchAddonItemId].sellable;
}

/** Launch add-ons that are currently sellable, in LAUNCH_ADDON_ITEM_IDS order. */
export function sellableLaunchAddonItems(): AlaCarteOffer[] {
  return LAUNCH_ADDON_ITEM_IDS.filter(isSellableLaunchAddonId).map((id) => ALA_CARTE_CATALOG[id]);
}
