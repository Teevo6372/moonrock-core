import { describe, expect, it } from "vitest";
import { ALA_CARTE_CATALOG, sellableAlaCarteItems, type AlaCarteItemId } from "../src/ala-carte-catalog.js";

const MUST_ATTACH_CRM: AlaCarteItemId[] = [
  "missed_call_textback",
  "booking_appointments",
  "surveys_forms",
  "review_request_automation",
  "quote_followup_sequences",
  "appointment_reminders",
  "seasonal_campaign_automation",
  "workflow_automations",
  "email_marketing",
  "ai_content_chat",
  "reputation_management",
  "unlimited_sales_funnels",
  "two_way_sms_marketing",
  "ecommerce_addon",
  "courses_products",
  "communities",
  // Launch add-ons
  "referral_engine",
  "reactivation_newsletter",
];

const MUST_NOT_REQUIRE_CRM: AlaCarteItemId[] = [
  "call_tracking",
  "document_signing",
  "seo_local_listings",
  "ad_management",
  "mobile_app",
  // Launch add-ons
  "review_response_autopilot",
  "gbp_autopilot",
  "monthly_scorecard",
  "social_content_autopilot",
  "local_seo_page_pack",
  "website_care_plan",
];

describe("ALA_CARTE_CATALOG pricing bands", () => {
  it("prices every trust_builder item with no setup fee", () => {
    for (const offer of Object.values(ALA_CARTE_CATALOG)) {
      if (offer.ascensionTier === "trust_builder") {
        expect(offer.setupFeeUsd, offer.id).toBe(0);
        expect(offer.monthlyFeeUsd, offer.id).toBeGreaterThan(0);
      }
    }
  });

  it("prices every human-checkpointed ascension_addon item with a setup fee to cover the human time", () => {
    // Items converted to zero-touch (humanCheckpointRequired: false) no longer carry a required setup fee.
    // This test guards only the items that still involve a Moonrock human.
    for (const offer of Object.values(ALA_CARTE_CATALOG)) {
      if (offer.ascensionTier === "ascension_addon" && offer.humanCheckpointRequired) {
        expect(offer.setupFeeUsd, offer.id).toBeGreaterThan(0);
      }
    }
  });

  it("prices every custom_build item with a larger setup fee and real human work", () => {
    for (const offer of Object.values(ALA_CARTE_CATALOG)) {
      if (offer.ascensionTier === "custom_build") {
        expect(offer.setupFeeUsd, offer.id).toBeGreaterThanOrEqual(199);
        expect(offer.humanCheckpointRequired, offer.id).toBe(true);
      }
    }
  });
});

describe("checkpoint flags — humanCheckpointRequired and clientApprovalRequired", () => {
  it("never sets both humanCheckpointRequired and clientApprovalRequired on the same item", () => {
    for (const offer of Object.values(ALA_CARTE_CATALOG)) {
      expect(offer.humanCheckpointRequired && offer.clientApprovalRequired, offer.id).toBe(false);
    }
  });

  it("marks converted zero-touch items with client approval instead of a human checkpoint", () => {
    // These items previously had humanCheckpointRequired: true; now the client approves instead.
    const clientApprovalItems: AlaCarteItemId[] = [
      "quote_followup_sequences",
      "seasonal_campaign_automation",
      "review_response_autopilot",
      "reactivation_newsletter",
      "social_content_autopilot",
      "local_seo_page_pack",
      "website_care_plan",
    ];
    for (const id of clientApprovalItems) {
      expect(ALA_CARTE_CATALOG[id].humanCheckpointRequired, id).toBe(false);
      expect(ALA_CARTE_CATALOG[id].clientApprovalRequired, id).toBe(true);
    }
  });

  it("marks fully zero-touch items with no checkpoint from anyone", () => {
    const fullyZeroTouch: AlaCarteItemId[] = [
      "document_signing",
      "gbp_autopilot",
      "referral_engine",
      "monthly_scorecard",
    ];
    for (const id of fullyZeroTouch) {
      expect(ALA_CARTE_CATALOG[id].humanCheckpointRequired, id).toBe(false);
      expect(ALA_CARTE_CATALOG[id].clientApprovalRequired, id).toBe(false);
    }
  });
});

describe("sellable flag", () => {
  it("marks Launch Plan duplicates as unsellable", () => {
    const launchDuplicates: AlaCarteItemId[] = [
      "missed_call_textback",
      "crm_pipeline",
      "reputation_management",
      "review_request_automation",
      "appointment_reminders",
    ];
    for (const id of launchDuplicates) {
      expect(ALA_CARTE_CATALOG[id].sellable, id).toBe(false);
    }
  });

  it("marks tracking_analytics as unsellable (replaced by monthly_scorecard)", () => {
    expect(ALA_CARTE_CATALOG.tracking_analytics.sellable).toBe(false);
  });

  it("marks gated items as unsellable until their config gate is lifted", () => {
    const gated: AlaCarteItemId[] = ["social_content_autopilot", "local_seo_page_pack", "website_care_plan"];
    for (const id of gated) {
      expect(ALA_CARTE_CATALOG[id].sellable, id).toBe(false);
    }
  });

  it("returns only sellable items from sellableAlaCarteItems()", () => {
    const sellable = sellableAlaCarteItems();
    expect(sellable.every((offer) => offer.sellable)).toBe(true);
    const unsellableIds = Object.values(ALA_CARTE_CATALOG)
      .filter((offer) => !offer.sellable)
      .map((offer) => offer.id);
    for (const id of unsellableIds) {
      expect(sellable.some((offer) => offer.id === id)).toBe(false);
    }
  });
});

describe("Always-Bundle CRM rule membership", () => {
  it("requires CRM for every item that captures, logs, or routes a customer interaction", () => {
    for (const id of MUST_ATTACH_CRM) {
      expect(ALA_CARTE_CATALOG[id].requiresCrm, id).toBe(true);
    }
  });

  it("does not require CRM for items that can stand alone", () => {
    for (const id of MUST_NOT_REQUIRE_CRM) {
      expect(ALA_CARTE_CATALOG[id].requiresCrm, id).toBe(false);
    }
  });

  it("keeps CRM itself independently purchasable and not requiring itself", () => {
    expect(ALA_CARTE_CATALOG.crm_pipeline.requiresCrm).toBe(false);
  });
});

describe("catalog completeness", () => {
  it("has all 31 catalog items (23 original + 8 launch add-ons), including retired and gated ones", () => {
    // Retired items are kept in the catalog (not hard-deleted) so existing type
    // references, CRM auto-attach logic, and fast-track logic don't break.
    expect(Object.keys(ALA_CARTE_CATALOG)).toHaveLength(31);
  });

  it("has 5 ungated new add-ons that are sellable", () => {
    const newSellable: AlaCarteItemId[] = [
      "review_response_autopilot",
      "referral_engine",
      "gbp_autopilot",
      "reactivation_newsletter",
      "monthly_scorecard",
    ];
    for (const id of newSellable) {
      expect(ALA_CARTE_CATALOG[id].sellable, id).toBe(true);
      expect(ALA_CARTE_CATALOG[id].automationTier, id).toBe("zero_touch");
    }
  });

  it("confirms new add-on prices match the launch-addons spec", () => {
    expect(ALA_CARTE_CATALOG.review_response_autopilot).toMatchObject({ setupFeeUsd: 0, monthlyFeeUsd: 29 });
    expect(ALA_CARTE_CATALOG.referral_engine).toMatchObject({ setupFeeUsd: 0, monthlyFeeUsd: 29 });
    expect(ALA_CARTE_CATALOG.gbp_autopilot).toMatchObject({ setupFeeUsd: 49, monthlyFeeUsd: 39 });
    expect(ALA_CARTE_CATALOG.reactivation_newsletter).toMatchObject({ setupFeeUsd: 0, monthlyFeeUsd: 49 });
    expect(ALA_CARTE_CATALOG.monthly_scorecard).toMatchObject({ setupFeeUsd: 0, monthlyFeeUsd: 19 });
  });

  it("confirms converted item prices match the launch-addons spec", () => {
    // quote_followup_sequences: drop $99 setup
    expect(ALA_CARTE_CATALOG.quote_followup_sequences).toMatchObject({ setupFeeUsd: 0, monthlyFeeUsd: 49 });
    // seasonal_campaign_automation: drop $149 setup, monthly $79 → $59
    expect(ALA_CARTE_CATALOG.seasonal_campaign_automation).toMatchObject({ setupFeeUsd: 0, monthlyFeeUsd: 59 });
    // document_signing: drop $49 setup
    expect(ALA_CARTE_CATALOG.document_signing).toMatchObject({ setupFeeUsd: 0, monthlyFeeUsd: 29 });
  });
});

describe("automationTier - per-item execution automation, independent of ascensionTier", () => {
  const ZERO_TOUCH: AlaCarteItemId[] = [
    "missed_call_textback", "crm_pipeline", "booking_appointments", "call_tracking", "reputation_management",
    "surveys_forms", "tracking_analytics", "review_request_automation", "quote_followup_sequences",
    "appointment_reminders", "seasonal_campaign_automation", "email_marketing", "ai_content_chat", "document_signing",
    // Launch add-ons (all zero_touch)
    "review_response_autopilot", "referral_engine", "gbp_autopilot", "reactivation_newsletter", "monthly_scorecard",
    "social_content_autopilot", "local_seo_page_pack", "website_care_plan",
  ];
  const ASYNC_HUMAN: AlaCarteItemId[] = ["mobile_app", "workflow_automations", "seo_local_listings", "two_way_sms_marketing"];
  const DELIVERY_HUMAN: AlaCarteItemId[] = ["unlimited_sales_funnels", "ecommerce_addon", "ad_management", "courses_products", "communities"];

  it("tags every item with exactly one automation tier", () => {
    for (const id of ZERO_TOUCH) expect(ALA_CARTE_CATALOG[id].automationTier, id).toBe("zero_touch");
    for (const id of ASYNC_HUMAN) expect(ALA_CARTE_CATALOG[id].automationTier, id).toBe("async_human");
    for (const id of DELIVERY_HUMAN) expect(ALA_CARTE_CATALOG[id].automationTier, id).toBe("delivery_human");
    expect(ZERO_TOUCH.length + ASYNC_HUMAN.length + DELIVERY_HUMAN.length).toBe(Object.keys(ALA_CARTE_CATALOG).length);
  });

  it("does not always agree with ascensionTier - e.g. Document Signing is zero_touch despite being ascension_addon", () => {
    expect(ALA_CARTE_CATALOG.document_signing.ascensionTier).toBe("ascension_addon");
    expect(ALA_CARTE_CATALOG.document_signing.automationTier).toBe("zero_touch");
    expect(ALA_CARTE_CATALOG.mobile_app.ascensionTier).toBe("trust_builder");
    expect(ALA_CARTE_CATALOG.mobile_app.automationTier).toBe("async_human");
  });
});

describe("AI Employee naming collision rule", () => {
  it("never uses Moonrock's reserved 'AI Employee' branding in the a la carte catalog", () => {
    for (const offer of Object.values(ALA_CARTE_CATALOG)) {
      expect(offer.name.toLowerCase(), offer.id).not.toContain("ai employee");
    }
  });

  it("flags items that overlap GHL's native AI Employee bundle components", () => {
    expect(ALA_CARTE_CATALOG.reputation_management.ghlNativeComponentNote).toBeDefined();
    expect(ALA_CARTE_CATALOG.ai_content_chat.ghlNativeComponentNote).toBeDefined();
    expect(ALA_CARTE_CATALOG.review_response_autopilot.ghlNativeComponentNote).toBeDefined();
    expect(ALA_CARTE_CATALOG.social_content_autopilot.ghlNativeComponentNote).toBeDefined();
  });
});
