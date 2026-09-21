import { describe, expect, it } from "vitest";
import {
  composeAlaCarteBundle,
  composeCrossTierBundle,
  computeBundleMonthlySavings,
  computeBundleSeparateMonthlyTotal,
  downsellBundle,
  isBundleSellable,
  LAUNCH_ADDON_BUNDLES,
  requiresCrmAttachment,
  sellableLaunchAddonBundles,
} from "../src/ascension-bundle.js";
import { diagnoseWebsiteBuild, type DiagnosticInput } from "../src/diagnostic-engine.js";
import { ALA_CARTE_CATALOG } from "../src/ala-carte-catalog.js";

function input(overrides: Partial<DiagnosticInput> = {}): DiagnosticInput {
  return { path: "existing_business", ...overrides };
}

describe("Always-Bundle CRM rule (requiresCrmAttachment)", () => {
  it("returns true when any requested item must attach CRM", () => {
    expect(requiresCrmAttachment(["booking_appointments"])).toBe(true);
    expect(requiresCrmAttachment(["call_tracking", "workflow_automations"])).toBe(true);
  });

  it("returns false when every requested item can stand alone", () => {
    expect(requiresCrmAttachment(["call_tracking", "document_signing", "seo_local_listings", "ad_management", "mobile_app"])).toBe(false);
  });
});

describe("composeAlaCarteBundle", () => {
  it("auto-attaches CRM when a requested item needs it and the visitor has none", () => {
    const bundle = composeAlaCarteBundle(["booking_appointments"]);
    expect(bundle.crmAutoAttached).toBe(true);
    expect(bundle.lineItems.some((item) => item.itemId === "crm_pipeline" && item.source === "auto_attached_crm")).toBe(true);
  });

  it("does not auto-attach CRM when the visitor already has one", () => {
    const bundle = composeAlaCarteBundle(["booking_appointments"], { hasExistingCrm: true });
    expect(bundle.crmAutoAttached).toBe(false);
    expect(bundle.lineItems.some((item) => item.itemId === "crm_pipeline")).toBe(false);
  });

  it("does not auto-attach CRM when every requested item can stand alone", () => {
    const bundle = composeAlaCarteBundle(["call_tracking"]);
    expect(bundle.crmAutoAttached).toBe(false);
    expect(bundle.lineItems).toHaveLength(1);
  });

  it("does not double-attach CRM when it was already explicitly requested", () => {
    const bundle = composeAlaCarteBundle(["crm_pipeline", "booking_appointments"]);
    expect(bundle.lineItems.filter((item) => item.itemId === "crm_pipeline")).toHaveLength(1);
    expect(bundle.crmAutoAttached).toBe(false);
  });

  it("prices the bundle as a straight sum of catalog prices, no discount", () => {
    const bundle = composeAlaCarteBundle(["crm_pipeline", "booking_appointments"]);
    expect(bundle.blendedMonthlyFeeUsd).toBe(49 + 29);
    expect(bundle.blendedSetupFeeUsd).toBe(0);
  });

  it("offers a standalone alternative for each line item when more than one is bundled", () => {
    const bundle = composeAlaCarteBundle(["crm_pipeline", "booking_appointments"]);
    expect(bundle.alternatives).toHaveLength(bundle.lineItems.length);
  });
});

describe("downsellBundle", () => {
  it("recomputes a lower blended price after dropping a requested item", () => {
    const bundle = composeAlaCarteBundle(["crm_pipeline", "booking_appointments", "reputation_management"]);
    const downsold = downsellBundle(bundle, ["reputation_management"]);
    expect(downsold.blendedMonthlyFeeUsd).toBe(49 + 29);
    expect(downsold.lineItems.some((item) => item.itemId === "reputation_management")).toBe(false);
  });

  it("re-evaluates CRM auto-attachment after dropping the only CRM-requiring item", () => {
    const bundle = composeAlaCarteBundle(["booking_appointments", "call_tracking"]);
    expect(bundle.crmAutoAttached).toBe(true);
    const downsold = downsellBundle(bundle, ["booking_appointments"]);
    expect(downsold.crmAutoAttached).toBe(false);
    expect(downsold.lineItems.some((item) => item.itemId === "crm_pipeline")).toBe(false);
  });
});

describe("composeCrossTierBundle", () => {
  it("suggests CRM (and forms, if explicitly mentioned) when a website build describes a quote/contact form", () => {
    const bundle = composeCrossTierBundle("website_build", input({ websiteMustHaves: "We need a quote form that routes to our team." }));
    expect(bundle).toBeDefined();
    expect(bundle!.lineItems.some((item) => item.itemId === "crm_pipeline")).toBe(true);
    expect(bundle!.lineItems.every((item) => item.source === "cross_tier_suggestion")).toBe(true);
  });

  it("includes surveys_forms when forms are mentioned explicitly alongside the quote-form signal", () => {
    const bundle = composeCrossTierBundle("website_build", input({ websiteMustHaves: "A contact form and other forms for intake." }));
    expect(bundle!.lineItems.some((item) => item.itemId === "surveys_forms")).toBe(true);
  });

  it("returns undefined for a website build with no form/quote language", () => {
    const bundle = composeCrossTierBundle("website_build", input({ websiteScopeNeeded: "landing_page" }));
    expect(bundle).toBeUndefined();
  });

  it("delegates to composeAlaCarteBundle for the ala_carte tier", () => {
    const bundle = composeCrossTierBundle("ala_carte", input(), ["booking_appointments"]);
    expect(bundle).toBeDefined();
    expect(bundle!.crmAutoAttached).toBe(true);
  });

  it("returns undefined for ai_employee and ghl_saas (no cross-tier heuristic defined for them)", () => {
    expect(composeCrossTierBundle("ai_employee", input())).toBeUndefined();
    expect(composeCrossTierBundle("ghl_saas", input())).toBeUndefined();
  });
});

describe("LAUNCH_ADDON_BUNDLES — bundle data and computed pricing", () => {
  it("defines all four bundles", () => {
    expect(Object.keys(LAUNCH_ADDON_BUNDLES)).toEqual(
      expect.arrayContaining(["reputation_pack", "get_found_pack", "keep_customers_pack", "full_autopilot"]),
    );
    expect(Object.keys(LAUNCH_ADDON_BUNDLES)).toHaveLength(4);
  });

  it("stores exactly one bundle price per bundle (the computed totals are derived, not stored)", () => {
    // Verify the stored prices match the spec
    expect(LAUNCH_ADDON_BUNDLES.reputation_pack.bundleMonthlyFeeUsd).toBe(59);
    expect(LAUNCH_ADDON_BUNDLES.get_found_pack.bundleMonthlyFeeUsd).toBe(119);
    expect(LAUNCH_ADDON_BUNDLES.keep_customers_pack.bundleMonthlyFeeUsd).toBe(119);
    expect(LAUNCH_ADDON_BUNDLES.full_autopilot.bundleMonthlyFeeUsd).toBe(249);
  });

  it("computes reputation_pack separate total from catalog prices (never hard-coded)", () => {
    const bundle = LAUNCH_ADDON_BUNDLES.reputation_pack;
    const expectedSeparate = 29 + 29 + 19; // review_response_autopilot + referral_engine + monthly_scorecard
    expect(computeBundleSeparateMonthlyTotal(bundle)).toBe(expectedSeparate);
    expect(computeBundleMonthlySavings(bundle)).toBe(expectedSeparate - 59);
  });

  it("computes keep_customers_pack separate total from catalog prices", () => {
    const bundle = LAUNCH_ADDON_BUNDLES.keep_customers_pack;
    const expectedSeparate = 49 + 49 + 59; // quote_followup + reactivation_newsletter + seasonal_campaign
    expect(computeBundleSeparateMonthlyTotal(bundle)).toBe(expectedSeparate);
    expect(computeBundleMonthlySavings(bundle)).toBe(expectedSeparate - 119);
  });

  it("every bundle shows positive savings vs. buying separately", () => {
    for (const bundle of Object.values(LAUNCH_ADDON_BUNDLES)) {
      expect(computeBundleMonthlySavings(bundle), bundle.id).toBeGreaterThan(0);
    }
  });

  it("waives setup fees at Launch checkout for all four bundles", () => {
    for (const bundle of Object.values(LAUNCH_ADDON_BUNDLES)) {
      expect(bundle.setupFeesWaivedAtLaunchCheckout, bundle.id).toBe(true);
    }
  });

  it("full_autopilot contains exactly 10 items spanning all three other bundles plus website_care_plan", () => {
    const full = LAUNCH_ADDON_BUNDLES.full_autopilot;
    expect(full.itemIds).toHaveLength(10);
    // Every item from the three sub-bundles must appear
    for (const id of LAUNCH_ADDON_BUNDLES.reputation_pack.itemIds) {
      expect(full.itemIds).toContain(id);
    }
    for (const id of LAUNCH_ADDON_BUNDLES.get_found_pack.itemIds) {
      expect(full.itemIds).toContain(id);
    }
    for (const id of LAUNCH_ADDON_BUNDLES.keep_customers_pack.itemIds) {
      expect(full.itemIds).toContain(id);
    }
    expect(full.itemIds).toContain("website_care_plan");
  });

  it("every bundle item ID exists in ALA_CARTE_CATALOG", () => {
    for (const bundle of Object.values(LAUNCH_ADDON_BUNDLES)) {
      for (const id of bundle.itemIds) {
        expect(ALA_CARTE_CATALOG[id], `${bundle.id} references unknown item ${id}`).toBeDefined();
      }
    }
  });
});

describe("isBundleSellable and sellableLaunchAddonBundles — gating logic", () => {
  it("marks reputation_pack as sellable (all members are ungated)", () => {
    expect(isBundleSellable(LAUNCH_ADDON_BUNDLES.reputation_pack)).toBe(true);
  });

  it("marks keep_customers_pack as sellable (all members are ungated)", () => {
    expect(isBundleSellable(LAUNCH_ADDON_BUNDLES.keep_customers_pack)).toBe(true);
  });

  it("marks get_found_pack as unsellable because social_content_autopilot and local_seo_page_pack are gated", () => {
    expect(isBundleSellable(LAUNCH_ADDON_BUNDLES.get_found_pack)).toBe(false);
  });

  it("marks full_autopilot as unsellable because it contains gated items", () => {
    expect(isBundleSellable(LAUNCH_ADDON_BUNDLES.full_autopilot)).toBe(false);
  });

  it("sellableLaunchAddonBundles() returns only bundles with all members enabled", () => {
    const sellable = sellableLaunchAddonBundles();
    for (const bundle of sellable) {
      expect(isBundleSellable(bundle), bundle.id).toBe(true);
    }
    // get_found_pack and full_autopilot are gated — must not appear
    expect(sellable.some((b) => b.id === "get_found_pack")).toBe(false);
    expect(sellable.some((b) => b.id === "full_autopilot")).toBe(false);
  });
});

describe("the original worked example (startup founder -> CRM + site + forms bundle)", () => {
  // Ascension funnel v2: classifyServiceTier is short-circuited to always return
  // ai_employee (see diagnostic-engine.ts), so this scenario can no longer be
  // reached through the live classification path - but composeCrossTierBundle
  // itself is untouched and dormant, ready to come back once website_build is a
  // sellable tier again. This exercises it directly with the website_build tier.
  it("composes a CRM + Surveys & Forms cross-tier bundle for the quote/contact form, given the website_build tier directly", () => {
    const startupFounder = input({
      path: "startup",
      hasExistingWebsite: false,
      websiteMustHaves: "A quote form so people can request pricing, plus a few other forms for general intake.",
    });

    const websiteDiagnosis = diagnoseWebsiteBuild(startupFounder);
    expect(websiteDiagnosis.recommendedOfferId).toBe("growth_site");

    const bundle = composeCrossTierBundle("website_build", startupFounder);
    expect(bundle).toBeDefined();
    expect(bundle!.crmAutoAttached).toBe(true);
    expect(bundle!.lineItems.map((item) => item.itemId).sort()).toEqual(["crm_pipeline", "surveys_forms"]);
    expect(bundle!.lineItems.every((item) => item.source === "cross_tier_suggestion")).toBe(true);
    // Straight sum of catalog prices, no discount (CRM $49/mo + Surveys & Forms $39/mo, no setup fee on either).
    expect(bundle!.blendedMonthlyFeeUsd).toBe(49 + 39);
    expect(bundle!.blendedSetupFeeUsd).toBe(0);
  });
});
