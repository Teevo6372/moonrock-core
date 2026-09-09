import { describe, expect, it } from "vitest";
import { ALA_CARTE_CATALOG, type AlaCarteItemId } from "../src/ala-carte-catalog.js";

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
];

const MUST_NOT_REQUIRE_CRM: AlaCarteItemId[] = [
  "call_tracking",
  "document_signing",
  "seo_local_listings",
  "ad_management",
  "mobile_app",
];

describe("ALA_CARTE_CATALOG pricing bands", () => {
  it("prices every trust_builder item with no setup fee", () => {
    for (const offer of Object.values(ALA_CARTE_CATALOG)) {
      if (offer.ascensionTier === "trust_builder") {
        expect(offer.setupFeeUsd).toBe(0);
        expect(offer.monthlyFeeUsd).toBeGreaterThan(0);
      }
    }
  });

  it("prices every ascension_addon item with a setup fee and one human checkpoint", () => {
    for (const offer of Object.values(ALA_CARTE_CATALOG)) {
      if (offer.ascensionTier === "ascension_addon") {
        expect(offer.setupFeeUsd).toBeGreaterThan(0);
        expect(offer.humanCheckpointRequired).toBe(true);
      }
    }
  });

  it("prices every custom_build item with a larger setup fee and real human work", () => {
    for (const offer of Object.values(ALA_CARTE_CATALOG)) {
      if (offer.ascensionTier === "custom_build") {
        expect(offer.setupFeeUsd).toBeGreaterThanOrEqual(199);
        expect(offer.humanCheckpointRequired).toBe(true);
      }
    }
  });
});

describe("Always-Bundle CRM rule membership", () => {
  it("requires CRM for every item that captures, logs, or routes a customer interaction", () => {
    for (const id of MUST_ATTACH_CRM) {
      expect(ALA_CARTE_CATALOG[id].requiresCrm).toBe(true);
    }
  });

  it("does not require CRM for items that can stand alone", () => {
    for (const id of MUST_NOT_REQUIRE_CRM) {
      expect(ALA_CARTE_CATALOG[id].requiresCrm).toBe(false);
    }
  });

  it("keeps CRM itself independently purchasable and not requiring itself", () => {
    expect(ALA_CARTE_CATALOG.crm_pipeline.requiresCrm).toBe(false);
  });
});

describe("Section 5.1-5.3 completeness", () => {
  it("has all 23 confirmed a la carte items, none dropped", () => {
    expect(Object.keys(ALA_CARTE_CATALOG)).toHaveLength(23);
  });

  it("confirms the 5 previously-missing items at their Section 7 decision #13 prices", () => {
    expect(ALA_CARTE_CATALOG.missed_call_textback.monthlyFeeUsd).toBe(49);
    expect(ALA_CARTE_CATALOG.missed_call_textback.setupFeeUsd).toBe(0);
    expect(ALA_CARTE_CATALOG.review_request_automation).toMatchObject({ setupFeeUsd: 99, monthlyFeeUsd: 49 });
    expect(ALA_CARTE_CATALOG.quote_followup_sequences).toMatchObject({ setupFeeUsd: 99, monthlyFeeUsd: 49 });
    expect(ALA_CARTE_CATALOG.appointment_reminders).toMatchObject({ setupFeeUsd: 49, monthlyFeeUsd: 29 });
    expect(ALA_CARTE_CATALOG.seasonal_campaign_automation).toMatchObject({ setupFeeUsd: 149, monthlyFeeUsd: 79 });
  });
});

describe("automationTier - per-item execution automation, independent of ascensionTier", () => {
  const ZERO_TOUCH: AlaCarteItemId[] = [
    "missed_call_textback", "crm_pipeline", "booking_appointments", "call_tracking", "reputation_management",
    "surveys_forms", "tracking_analytics", "review_request_automation", "quote_followup_sequences",
    "appointment_reminders", "seasonal_campaign_automation", "email_marketing", "ai_content_chat", "document_signing",
  ];
  const ASYNC_HUMAN: AlaCarteItemId[] = ["mobile_app", "workflow_automations", "seo_local_listings", "two_way_sms_marketing"];
  const DELIVERY_HUMAN: AlaCarteItemId[] = ["unlimited_sales_funnels", "ecommerce_addon", "ad_management", "courses_products", "communities"];

  it("tags every item with exactly one automation tier, matching Sections 5.1-5.3's per-row Automation column", () => {
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
      expect(offer.name.toLowerCase()).not.toContain("ai employee");
    }
  });

  it("flags items that overlap GHL's native AI Employee bundle components", () => {
    expect(ALA_CARTE_CATALOG.reputation_management.ghlNativeComponentNote).toBeDefined();
    expect(ALA_CARTE_CATALOG.ai_content_chat.ghlNativeComponentNote).toBeDefined();
  });
});
