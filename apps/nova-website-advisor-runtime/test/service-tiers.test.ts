import { describe, expect, it } from "vitest";

import { GHL_SAAS_CATALOG, WEBSITE_BUILD_CATALOG } from "../src/ai-employee-catalog.js";
import { classifyServiceTier, diagnoseGhlSaas, diagnoseWebsiteBuild, type DiagnosticInput } from "../src/diagnostic-engine.js";
import { normalizeDiscoveryAnswer } from "../src/conversation-normalizer.js";
import { buildWebsiteBrief, toWebsiteBuildRequest } from "../src/website-build.js";

function input(overrides: Partial<DiagnosticInput> = {}): DiagnosticInput {
  return { path: "existing_business", ...overrides };
}

describe("classifyServiceTier", () => {
  it("falls back to ai_employee when no other tier signal is present", () => {
    const result = classifyServiceTier(input({ businessChallenges: "We keep missing calls during busy season." }));
    expect(result.tier).toBe("ai_employee");
  });

  it("classifies website_build when the visitor explicitly has no website", () => {
    const result = classifyServiceTier(input({ hasExistingWebsite: false }));
    expect(result).toMatchObject({ tier: "website_build", confidence: "explicit" });
  });

  it("infers website_build from free-text challenge language", () => {
    const result = classifyServiceTier(input({ businessChallenges: "Honestly we just don't have a website yet." }));
    expect(result.tier).toBe("website_build");
  });

  it("classifies ghl_saas when the visitor explicitly identifies as an agency/reseller", () => {
    const result = classifyServiceTier(input({ isAgencyOrReseller: true }));
    expect(result).toMatchObject({ tier: "ghl_saas", confidence: "explicit" });
  });

  it("infers ghl_saas from agency industry plus reselling language", () => {
    const result = classifyServiceTier(input({ industry: "marketing agency", businessChallenges: "I want to resell this to my clients." }));
    expect(result.tier).toBe("ghl_saas");
  });

  it("does not classify ghl_saas from reselling language alone without an agency-shaped industry", () => {
    const result = classifyServiceTier(input({ industry: "plumbing", businessChallenges: "I want to resell this to my clients." }));
    expect(result.tier).toBe("ai_employee");
  });

  it("prioritizes ghl_saas over website_build when both signals are present", () => {
    const result = classifyServiceTier(input({ isAgencyOrReseller: true, hasExistingWebsite: false }));
    expect(result.tier).toBe("ghl_saas");
  });
});

describe("diagnoseWebsiteBuild", () => {
  it("recommends starter_site for a landing_page scope", () => {
    expect(diagnoseWebsiteBuild(input({ websiteScopeNeeded: "landing_page" })).recommendedOfferId).toBe("starter_site");
  });

  it("recommends growth_site for a multi_page scope", () => {
    expect(diagnoseWebsiteBuild(input({ websiteScopeNeeded: "multi_page" })).recommendedOfferId).toBe("growth_site");
  });

  it("recommends custom_site for an ecommerce scope", () => {
    expect(diagnoseWebsiteBuild(input({ websiteScopeNeeded: "ecommerce" })).recommendedOfferId).toBe("custom_site");
  });

  it("defaults to growth_site when scope is not yet known", () => {
    expect(diagnoseWebsiteBuild(input()).recommendedOfferId).toBe("growth_site");
  });
});

describe("diagnoseGhlSaas", () => {
  it("recommends saas_starter for a small client count", () => {
    expect(diagnoseGhlSaas(input({ numberOfClientsManaged: 3 })).recommendedOfferId).toBe("saas_starter");
  });

  it("recommends saas_growth for a mid-size client count", () => {
    expect(diagnoseGhlSaas(input({ numberOfClientsManaged: 12 })).recommendedOfferId).toBe("saas_growth");
  });

  it("resolves the full catalog offer (name, price, seats, features), not just an id", () => {
    const result = diagnoseGhlSaas(input({ numberOfClientsManaged: 3 }));
    expect(result).toMatchObject({
      offerName: "SaaS Starter",
      monthlyFeeUsd: 97,
      includedSeats: 1,
    });
    expect(result.includedFeatures.length).toBeGreaterThan(0);
  });

  it("recommends saas_pro for a large client count", () => {
    expect(diagnoseGhlSaas(input({ numberOfClientsManaged: 30 })).recommendedOfferId).toBe("saas_pro");
  });
});

describe("website build catalog pricing", () => {
  it("stays within the approved $500-$2,500 setup band", () => {
    for (const offer of Object.values(WEBSITE_BUILD_CATALOG)) {
      expect(offer.setupFeeUsd).toBeGreaterThanOrEqual(500);
      expect(offer.setupFeeUsd).toBeLessThanOrEqual(2500);
    }
  });
});

describe("GHL white label SaaS catalog pricing", () => {
  it("stays within the approved $97-$297/month band", () => {
    for (const offer of Object.values(GHL_SAAS_CATALOG)) {
      expect(offer.monthlyFeeUsd).toBeGreaterThanOrEqual(97);
      expect(offer.monthlyFeeUsd).toBeLessThanOrEqual(297);
    }
  });
});

describe("buildWebsiteBrief", () => {
  it("surfaces unanswered fields as assumptions to confirm", () => {
    const brief = buildWebsiteBrief(input({ businessName: "Acme Landscaping" }));
    expect(brief.assumptionsToConfirm).toContain("Confirmed page/section scope");
    expect(brief.assumptionsToConfirm).toContain("Any must-have pages, integrations, or features");
    expect(brief.assumptionsToConfirm).toContain("Whether approved brand assets already exist");
  });

  it("does not list an answered field as an assumption to confirm", () => {
    const brief = buildWebsiteBrief(input({ websiteScopeNeeded: "multi_page" }));
    expect(brief.assumptionsToConfirm).not.toContain("Confirmed page/section scope");
    expect(brief.offerId).toBe("growth_site");
  });
});

describe("toWebsiteBuildRequest", () => {
  it("marks a brand-new site as low risk and auto-eligible", () => {
    const brief = buildWebsiteBrief(input({ hasExistingWebsite: false, websiteScopeNeeded: "landing_page" }));
    const request = toWebsiteBuildRequest(brief, "session-123");
    expect(request.risk).toBe("low");
    expect(request.mode).toBe("auto");
    expect(request.siteId).toBe("session-123");
  });

  it("marks an existing-site rebuild as moderate risk requiring preview", () => {
    const brief = buildWebsiteBrief(input({ hasExistingWebsite: true, websiteScopeNeeded: "multi_page" }));
    const request = toWebsiteBuildRequest(brief, "session-456");
    expect(request.risk).toBe("moderate");
    expect(request.mode).toBe("preview_required");
  });

  it("requests brand assets when the visitor does not have approved ones", () => {
    const brief = buildWebsiteBrief(input({ hasApprovedBrandAssets: false }));
    const request = toWebsiteBuildRequest(brief, "session-789");
    expect(request.assetRequests).toHaveLength(1);
    expect(request.assetRequests?.[0]?.purpose).toBe("brand_assets");
  });
});

describe("normalizeDiscoveryAnswer for new service-tier fields", () => {
  it("coerces free-text 'no' answers to false for hasExistingWebsite", () => {
    const result = normalizeDiscoveryAnswer("hasExistingWebsite", "No, we don't have a website yet.");
    expect(result).toMatchObject({ value: false, interpreted: true });
  });

  it("coerces free-text 'yes' answers to true for hasExistingWebsite", () => {
    const result = normalizeDiscoveryAnswer("hasExistingWebsite", "Yes, we have one already.");
    expect(result).toMatchObject({ value: true, interpreted: true });
  });

  it("asks for clarification when hasExistingWebsite can't be interpreted", () => {
    const result = normalizeDiscoveryAnswer("hasExistingWebsite", "Maybe, not totally sure.");
    expect(result.needsClarification).toBe(true);
  });

  it("coerces multi-page free text to the multi_page enum for websiteScopeNeeded", () => {
    const result = normalizeDiscoveryAnswer("websiteScopeNeeded", "We'd want a multi-page site, probably 5 to 8 pages.");
    expect(result).toMatchObject({ value: "multi_page", interpreted: true });
  });

  it("coerces landing-page free text to the landing_page enum for websiteScopeNeeded", () => {
    const result = normalizeDiscoveryAnswer("websiteScopeNeeded", "Just a single landing page is fine.");
    expect(result).toMatchObject({ value: "landing_page", interpreted: true });
  });

  it("coerces online-store free text to the ecommerce enum for websiteScopeNeeded", () => {
    const result = normalizeDiscoveryAnswer("websiteScopeNeeded", "We want to sell products online with a shopping cart.");
    expect(result).toMatchObject({ value: "ecommerce", interpreted: true });
  });
});
