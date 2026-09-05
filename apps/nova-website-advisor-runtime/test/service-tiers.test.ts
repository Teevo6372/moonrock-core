import { describe, expect, it } from "vitest";

import { AI_EMPLOYEE_CATALOG, approvedServiceCatalog, GHL_SAAS_CATALOG, WEBSITE_BUILD_CATALOG } from "../src/ai-employee-catalog.js";
import { ALA_CARTE_CATALOG } from "../src/ala-carte-catalog.js";
import { chooseGhlSaasOfferWithinBudget, chooseOfferWithinBudget, chooseWebsiteBuildOfferWithinBudget, classifyServiceTier, diagnoseBusiness, diagnoseGhlSaas, diagnoseWebsiteBuild, extractStatedMonthlyBudgetUsd, extractStatedSetupBudgetUsd, type DiagnosticInput } from "../src/diagnostic-engine.js";
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

  it("infers website_build when the visitor wants online store/e-commerce setup, even without saying they lack a website (regression: this previously fell through to ai_employee)", () => {
    expect(classifyServiceTier(input({ businessChallenges: "I run a card shop and I'm seeking online store setup." })).tier).toBe("website_build");
    expect(classifyServiceTier(input({ businessChallenges: "We want to start selling online, maybe an e-commerce site." })).tier).toBe("website_build");
    expect(classifyServiceTier(input({ businessChallenges: "Need a shopping cart added so customers can check out." })).tier).toBe("website_build");
  });

  it("does not misclassify unrelated 'store' or 'online' mentions as an online-store request", () => {
    const result = classifyServiceTier(input({ businessChallenges: "We store customer records manually and it's a mess.", industry: "home services" }));
    expect(result.tier).toBe("ai_employee");
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

  it("scores a website_scope_gap bottleneck when must-haves describe more than a landing page", () => {
    const result = diagnoseWebsiteBuild(input({ websiteMustHaves: "We need online booking and an online store." }));
    expect(result.bottlenecks.some((finding) => finding.id === "website_scope_gap")).toBe(true);
  });

  it("upgrades a landing_page scope to growth_site when must-haves reveal more scope", () => {
    const result = diagnoseWebsiteBuild(input({ websiteScopeNeeded: "landing_page", websiteMustHaves: "We also want appointment booking on the site." }));
    expect(result.recommendedOfferId).toBe("growth_site");
  });

  it("does not score a scope gap when no scope-expanding language is present", () => {
    const result = diagnoseWebsiteBuild(input({ websiteScopeNeeded: "landing_page" }));
    expect(result.bottlenecks).toHaveLength(0);
  });
});

describe("diagnoseWebsiteBuild budget-aware revision", () => {
  it("overrides the recommendation when it exceeds a stated one-time setup budget", () => {
    const result = diagnoseWebsiteBuild(input({ websiteScopeNeeded: "ecommerce" }));
    expect(result.recommendedOfferId).toBe("custom_site");

    const budgeted = diagnoseWebsiteBuild(input({ websiteScopeNeeded: "ecommerce", setupBudgetCeilingUsd: 800 }));
    expect(budgeted.recommendedOfferId).toBe("starter_site");
    expect(budgeted.recommendationReason).toContain("$800 budget");
  });

  it("leaves the recommendation untouched when it already fits the stated budget", () => {
    const result = diagnoseWebsiteBuild(input({ websiteScopeNeeded: "landing_page", setupBudgetCeilingUsd: 2000 }));
    expect(result.recommendedOfferId).toBe("starter_site");
    expect(result.recommendationReason).not.toContain("budget");
  });

  it("extractStatedSetupBudgetUsd reads a one-time amount gated behind a budget-objection cue", () => {
    expect(extractStatedSetupBudgetUsd("We can only afford $800 total for this.")).toBe(800);
    expect(extractStatedSetupBudgetUsd("Our site should be blue, like $800 blue.")).toBeUndefined();
  });

  it("chooseWebsiteBuildOfferWithinBudget is honest about the catalog floor rather than inventing a discount", () => {
    const fit = chooseWebsiteBuildOfferWithinBudget(100);
    expect(fit.fitsWithinBudget).toBe(false);
    expect(fit.offerId).toBe("starter_site");
    expect(fit.cheapestSetupFeeUsd).toBe(500);
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

  it("scores an agency_client_load bottleneck from described manual reporting or client churn", () => {
    const result = diagnoseGhlSaas(input({ businessChallenges: "Onboarding takes forever and clients keep switching away from us." }));
    expect(result.bottlenecks.some((finding) => finding.id === "agency_client_load")).toBe(true);
  });

  it("upgrades saas_starter to saas_growth when client-load signals are present but client count is low", () => {
    const result = diagnoseGhlSaas(input({ numberOfClientsManaged: 3, businessChallenges: "We spend hours on manual reporting for our clients." }));
    expect(result.recommendedOfferId).toBe("saas_growth");
  });

  it("does not score a client-load signal when no such language is present", () => {
    const result = diagnoseGhlSaas(input({ numberOfClientsManaged: 3 }));
    expect(result.bottlenecks).toHaveLength(0);
  });
});

describe("diagnoseGhlSaas budget-aware revision", () => {
  it("overrides the recommendation when it exceeds a stated monthly budget ceiling", () => {
    const result = diagnoseGhlSaas(input({ numberOfClientsManaged: 30 }));
    expect(result.recommendedOfferId).toBe("saas_pro");

    const budgeted = diagnoseGhlSaas(input({ numberOfClientsManaged: 30, budgetCeilingMonthlyUsd: 200 }));
    expect(budgeted.recommendedOfferId).toBe("saas_growth");
    expect(budgeted.recommendationReason).toContain("$200/month budget");
  });

  it("leaves the recommendation untouched when it already fits the stated budget", () => {
    const result = diagnoseGhlSaas(input({ numberOfClientsManaged: 3, budgetCeilingMonthlyUsd: 500 }));
    expect(result.recommendedOfferId).toBe("saas_starter");
    expect(result.recommendationReason).not.toContain("budget");
  });

  it("chooseGhlSaasOfferWithinBudget is honest about the catalog floor rather than inventing a discount", () => {
    const fit = chooseGhlSaasOfferWithinBudget(10);
    expect(fit.fitsWithinBudget).toBe(false);
    expect(fit.offerId).toBe("saas_starter");
    expect(fit.cheapestMonthlyFeeUsd).toBe(97);
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

  it("coerces 'I'll handle most of those tasks' to true for founderHandlesMostAdmin (regression: previously stuck in a clarification loop)", () => {
    const result = normalizeDiscoveryAnswer("founderHandlesMostAdmin", "I'll handle most of those tasks.");
    expect(result).toMatchObject({ value: true, interpreted: true });
  });

  it("coerces other 'it's on me' phrasings to true for boolean fields", () => {
    expect(normalizeDiscoveryAnswer("founderHandlesMostAdmin", "That'll fall on me.")).toMatchObject({ value: true, interpreted: true });
    expect(normalizeDiscoveryAnswer("founderHandlesMostAdmin", "I'm handling all of it myself.")).toMatchObject({ value: true, interpreted: true });
    expect(normalizeDiscoveryAnswer("founderHandlesMostAdmin", "It's my responsibility for now.")).toMatchObject({ value: true, interpreted: true });
  });
});

describe("approvedServiceCatalog", () => {
  it("includes every AI Employee, Website Build, and GHL SaaS offer by real name", () => {
    const names = approvedServiceCatalog().map((service) => service.name);
    expect(names).toContain("Moonrock AI Front Office");
    expect(names).toContain("Growth Site");
    expect(names).toContain("SaaS Starter");
    expect(names.length).toBe(Object.keys(AI_EMPLOYEE_CATALOG).length + Object.keys(WEBSITE_BUILD_CATALOG).length + Object.keys(GHL_SAAS_CATALOG).length + Object.keys(ALA_CARTE_CATALOG).length);
  });

  it("never includes a hallucination-prone third-party platform name that isn't an actual offer", () => {
    const names = approvedServiceCatalog().map((service) => service.name.toLowerCase());
    expect(names.some((name) => name.includes("shopify"))).toBe(false);
  });
});

describe("extractStatedMonthlyBudgetUsd", () => {
  it("extracts a dollar amount stated with '/month' alongside an affordability objection", () => {
    expect(extractStatedMonthlyBudgetUsd("I'm a small business and can't afford $500.00 per month.")).toBe(500);
  });

  it("extracts a bare monthly amount without a dollar sign", () => {
    expect(extractStatedMonthlyBudgetUsd("That's too much, can we do 250 a month instead?")).toBe(250);
  });

  it("extracts an amount stated right after 'afford' even without a month suffix", () => {
    expect(extractStatedMonthlyBudgetUsd("Honestly I can only afford $150 right now.")).toBe(150);
  });

  it("extracts a budget stated as 'my budget is $X'", () => {
    expect(extractStatedMonthlyBudgetUsd("My budget is $300 for something like this.")).toBe(300);
  });

  it("does not treat an unrelated dollar amount as a budget ceiling", () => {
    expect(extractStatedMonthlyBudgetUsd("We do about $12,000 in monthly revenue.")).toBeUndefined();
  });

  it("does not misfire on ordinary conversation with no budget objection cue", () => {
    expect(extractStatedMonthlyBudgetUsd("Sounds good, tell me more about the Front Office plan.")).toBeUndefined();
  });
});

describe("chooseOfferWithinBudget", () => {
  it("picks the highest-value offer at or under the stated budget", () => {
    expect(chooseOfferWithinBudget(200)).toMatchObject({ offerId: "customer_care", fitsWithinBudget: true });
  });

  it("falls back to the cheapest catalog offer, honestly flagged, when nothing fits", () => {
    expect(chooseOfferWithinBudget(10)).toMatchObject({ offerId: "reputation_retention", fitsWithinBudget: false, cheapestMonthlyFeeUsd: 149 });
  });
});

describe("diagnoseBusiness budget-aware revision", () => {
  it("overrides the need-based recommendation when it exceeds a stated budget ceiling", () => {
    const result = diagnoseBusiness({ path: "existing_business", missedCallsPerMonth: 10, medianLeadResponseMinutes: 45 });
    expect(result.recommendedOfferId).toBe("front_office");

    const budgeted = diagnoseBusiness({ path: "existing_business", missedCallsPerMonth: 10, medianLeadResponseMinutes: 45, budgetCeilingMonthlyUsd: 200 });
    expect(budgeted.recommendedOfferId).toBe("customer_care");
    expect(budgeted.recommendationReason).toContain("$200/month budget");
  });

  it("leaves the need-based recommendation untouched when it already fits the stated budget", () => {
    const result = diagnoseBusiness({ path: "existing_business", repetitiveSupportLoad: "medium", budgetCeilingMonthlyUsd: 500 });
    expect(result.recommendedOfferId).toBe("customer_care");
    expect(result.recommendationReason).not.toContain("budget");
  });
});
