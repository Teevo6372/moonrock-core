import { describe, expect, it } from "vitest";
import { ALA_CARTE_CATALOG, type AlaCarteItemId } from "../src/ala-carte-catalog.js";

const MUST_ATTACH_CRM: AlaCarteItemId[] = [
  "booking_appointments",
  "surveys_forms",
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
