import { describe, expect, it } from "vitest";
import { composeAlaCarteBundle, composeCrossTierBundle, downsellBundle, requiresCrmAttachment } from "../src/ascension-bundle.js";
import type { DiagnosticInput } from "../src/diagnostic-engine.js";

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
