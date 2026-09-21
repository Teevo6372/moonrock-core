import { describe, expect, it } from "vitest";

import { approvedServiceCatalog, GHL_SAAS_CATALOG, WEBSITE_BUILD_CATALOG } from "../src/ai-employee-catalog.js";
import { chooseGhlSaasOfferWithinBudget, chooseOfferWithinBudget, chooseWebsiteBuildOfferWithinBudget, classifyServiceTier, diagnoseBusiness, diagnoseGhlSaas, diagnoseWebsiteBuild, extractStatedMonthlyBudgetUsd, extractStatedSetupBudgetUsd, type DiagnosticInput } from "../src/diagnostic-engine.js";
import { normalizeDiscoveryAnswer } from "../src/conversation-normalizer.js";
import { buildWebsiteBrief, toWebsiteBuildRequest } from "../src/website-build.js";

function input(overrides: Partial<DiagnosticInput> = {}): DiagnosticInput {
  return { path: "existing_business", ...overrides };
}

// Ascension funnel v2: classifyServiceTier is short-circuited to always return
// ai_employee (Moonrock Launch Plan is the only sellable offer right now - see
// diagnostic-engine.ts). The prior signal-based tier classification (website_build/
// ghl_saas/ala_carte) is in git history to bring back once more ascension-funnel
// products exist; these tests cover the new fixed behavior instead.
describe("classifyServiceTier", () => {
  it("always classifies ai_employee regardless of tier signals, now that Moonrock Launch Plan is the only sellable offer", () => {
    expect(classifyServiceTier(input({ businessChallenges: "We keep missing calls during busy season." })).tier).toBe("ai_employee");
    expect(classifyServiceTier(input({ hasExistingWebsite: false })).tier).toBe("ai_employee");
    expect(classifyServiceTier(input({ isAgencyOrReseller: true })).tier).toBe("ai_employee");
    expect(classifyServiceTier(input({ businessChallenges: "I just want something simple, not ready for a full website." })).tier).toBe("ai_employee");
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
    const fit = chooseWebsiteBuildOfferWithinBudget(50);
    expect(fit.fitsWithinBudget).toBe(false);
    expect(fit.offerId).toBe("starter_site");
    expect(fit.cheapestSetupFeeUsd).toBe(99);
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

  it("sets the Section 9.6 first-sale provisioning window on every tier, unlike the rest of the funnel's immediate delivery", () => {
    for (const clients of [3, 12, 30]) {
      const result = diagnoseGhlSaas(input({ numberOfClientsManaged: clients }));
      expect(result.estimatedDelivery).toContain("1–2 business days");
    }
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
  it("stays within the approved $99-$2,500 setup band", () => {
    for (const offer of Object.values(WEBSITE_BUILD_CATALOG)) {
      expect(offer.setupFeeUsd).toBeGreaterThanOrEqual(99);
      expect(offer.setupFeeUsd).toBeLessThanOrEqual(2500);
    }
  });

  it("prices Starter Site at its confirmed $99 floor (Sections 5.4/9.8) - a floor, not a flat rate", () => {
    expect(WEBSITE_BUILD_CATALOG.starter_site.setupFeeUsd).toBe(99);
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

describe("toWebsiteBuildRequest - Section 9.8 tier-gated autonomy split", () => {
  it("marks a Starter build as low risk and auto-eligible", () => {
    const brief = buildWebsiteBrief(input({ hasExistingWebsite: false, websiteScopeNeeded: "landing_page" }));
    expect(brief.offerId).toBe("starter_site");
    const request = toWebsiteBuildRequest(brief, "session-123");
    expect(request.risk).toBe("low");
    expect(request.mode).toBe("auto");
    expect(request.siteId).toBe("session-123");
  });

  it("marks a Growth build as moderate risk requiring a preview checkpoint, regardless of hasExistingWebsite", () => {
    const brief = buildWebsiteBrief(input({ hasExistingWebsite: true, websiteScopeNeeded: "multi_page" }));
    expect(brief.offerId).toBe("growth_site");
    const request = toWebsiteBuildRequest(brief, "session-456");
    expect(request.risk).toBe("moderate");
    expect(request.mode).toBe("preview_required");
  });

  it("always routes a Custom build to Stephen, even for a brand-new site with no other value closed this conversation", () => {
    // Regression: this used to key risk/mode off hasExistingWebsite alone, so a
    // brand-new (hasExistingWebsite: false) Custom Site build was incorrectly
    // marked risk "low" / mode "auto" - Custom must ALWAYS route to Stephen,
    // per Section 9.8, regardless of whether the visitor already had a site.
    const brief = buildWebsiteBrief(input({ hasExistingWebsite: false, websiteScopeNeeded: "ecommerce" }));
    expect(brief.offerId).toBe("custom_site");
    const request = toWebsiteBuildRequest(brief, "session-999");
    expect(request.risk).toBe("high");
    expect(request.mode).toBe("operator_review");
  });

  it("marks a Growth build as moderate/preview_required even for a brand-new site (tier drives autonomy, not hasExistingWebsite)", () => {
    const brief = buildWebsiteBrief(input({ hasExistingWebsite: false, websiteScopeNeeded: "multi_page" }));
    expect(brief.offerId).toBe("growth_site");
    const request = toWebsiteBuildRequest(brief, "session-321");
    expect(request.risk).toBe("moderate");
    expect(request.mode).toBe("preview_required");
  });

  it("keeps a Starter build autonomous when nothing else has closed this conversation", () => {
    const brief = buildWebsiteBrief(input({ websiteScopeNeeded: "landing_page" }));
    const request = toWebsiteBuildRequest(brief, "session-starter-solo");
    expect(request.mode).toBe("auto");
  });

  it("routes a Starter build to Stephen once the running one-time total this conversation exceeds the $999 threshold", () => {
    const brief = buildWebsiteBrief(input({ websiteScopeNeeded: "landing_page" }));
    // Starter's own setupFeeUsd alone (99) stays under threshold; combined with
    // $950 already closed elsewhere this conversation, the running total (1049)
    // crosses it - same cumulative-running-total philosophy as Section 9.2's
    // $700/mo check, extended to one-time value per Section 9.8's amendment.
    const request = toWebsiteBuildRequest(brief, "session-starter-stacked", { conversationOneTimeValueClosedUsd: 950 });
    expect(request.risk).toBe("high");
    expect(request.mode).toBe("operator_review");
  });

  it("also lets a heavily-negotiated Starter build alone cross the $999 threshold, not just when stacked with other sales", () => {
    // Starter's price is a floor, not a flat rate (Section 5.4/9.8) - Nova can
    // negotiate upward for add-ons at their own listed prices. This models a
    // negotiated Starter build whose OWN setupFeeUsd already exceeds $999
    // (nothing else closed this conversation), confirming the review gate
    // fires on the build's own negotiated price alone, not only when combined
    // with unrelated prior sales.
    const brief = buildWebsiteBrief(input({ websiteScopeNeeded: "landing_page" }));
    const negotiatedBrief = { ...brief, setupFeeUsd: 1050 };
    const request = toWebsiteBuildRequest(negotiatedBrief, "session-starter-negotiated");
    expect(request.risk).toBe("high");
    expect(request.mode).toBe("operator_review");
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
  it("includes the Moonrock Launch Plan as the first entry", () => {
    const names = approvedServiceCatalog().map((service) => service.name);
    expect(names[0]).toBe("Moonrock Launch Plan");
  });

  it("includes every sellable add-on from ALA_CARTE_CATALOG", () => {
    const names = approvedServiceCatalog().map((service) => service.name);
    // Spot-check the five ungated new add-ons
    expect(names).toContain("Review Response Autopilot");
    expect(names).toContain("Referral Engine");
    expect(names).toContain("Google Business Profile Autopilot");
    expect(names).toContain("Customer Reactivation & Newsletter");
    expect(names).toContain("Nova Monthly Scorecard");
  });

  it("never includes unsellable items (Launch duplicates, gated add-ons, or retired items)", () => {
    const names = approvedServiceCatalog().map((service) => service.name);
    // Launch duplicates
    expect(names).not.toContain("Missed-Call Text-Back");
    expect(names).not.toContain("Reputation Management");
    expect(names).not.toContain("Review Request Automation");
    // Gated items
    expect(names).not.toContain("Social Content Autopilot");
    expect(names).not.toContain("Local SEO Page Pack");
    expect(names).not.toContain("Website Care Plan");
    // Retired
    expect(names).not.toContain("Tracking & Analytics");
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
    expect(chooseOfferWithinBudget(10)).toMatchObject({ offerId: "moonrock_launch_plan", fitsWithinBudget: false, cheapestMonthlyFeeUsd: 97 });
  });
});

// Ascension funnel v2: chooseOffer always returns moonrock_launch_plan (see
// diagnostic-engine.ts), and at $97/mo it's already the cheapest catalog offer, so
// the budget-override branch in diagnoseBusiness can no longer be triggered by any
// realistic stated budget - it only fires below the offer's own price. Prior tests
// exercising a budget override BETWEEN two different need-based offers no longer
// apply (there's only one offer to recommend); this covers the new reality instead.
describe("diagnoseBusiness budget-aware revision", () => {
  it("always recommends moonrock_launch_plan regardless of a stated budget ceiling above its price", () => {
    const result = diagnoseBusiness({ path: "existing_business", missedCallsPerMonth: 10, medianLeadResponseMinutes: 45, budgetCeilingMonthlyUsd: 200 });
    expect(result.recommendedOfferId).toBe("moonrock_launch_plan");
    expect(result.recommendationReason).not.toContain("budget");
  });

  it("still fires the budget note (falling back to the catalog floor) when a stated budget is below moonrock_launch_plan's own price", () => {
    const result = diagnoseBusiness({ path: "existing_business", repetitiveSupportLoad: "medium", budgetCeilingMonthlyUsd: 50 });
    expect(result.recommendedOfferId).toBe("moonrock_launch_plan");
    expect(result.recommendationReason).toContain("catalog floor");
  });
});
