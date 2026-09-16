import { describe, expect, it } from "vitest";

import { AI_EMPLOYEE_CATALOG } from "../src/ai-employee-catalog.js";
import { diagnoseBusiness } from "../src/diagnostic-engine.js";
import { buildFlightPlan } from "../src/flight-plan.js";

describe("Nova Flight Plan", () => {
  it("builds a purchase-ready existing-business plan using canonical founding pricing", () => {
    const input = { path: "existing_business" as const, businessName: "ABC Plumbing", missedCallsPerMonth: 10, medianLeadResponseMinutes: 20, averageJobValueUsd: 800, closeRatePercent: 25 };
    const diagnosis = diagnoseBusiness(input);
    const plan = buildFlightPlan(input, diagnosis, { foundingCustomer: true });
    expect(plan.headline).toBe("Your Preliminary Moonrock Growth Flight Plan");
    expect(plan.recommendation.offerId).toBe("moonrock_launch_plan");
    expect(plan.recommendation.setupFeeUsd).toBe(AI_EMPLOYEE_CATALOG.moonrock_launch_plan.foundingCustomerSetupFeeUsd);
    expect(plan.recommendation.monthlyFeeUsd).toBe(AI_EMPLOYEE_CATALOG.moonrock_launch_plan.monthlyFeeUsd);
    expect(plan.recommendation.includedFeatures).toEqual([...AI_EMPLOYEE_CATALOG.moonrock_launch_plan.includedFeatures]);
    expect(plan.recommendation.estimatedDelivery).toBe(AI_EMPLOYEE_CATALOG.moonrock_launch_plan.estimatedDelivery);
    expect(plan.nextAction).toBe("purchase");
    expect(plan.opportunity?.monthlyOpportunityUsd).toBe(2000);
  });

  it("only recommends documented secondary offers supported by discovery evidence", () => {
    const input = { path: "existing_business" as const, businessChallenges: "We miss calls and estimates do not get followed up", missedCallsPerMonth: 8, estimatesNeedManualFollowUp: true };
    const diagnosis = diagnoseBusiness(input);
    const plan = buildFlightPlan(input, diagnosis);
    for (const addOn of plan.recommendedAddOns) {
      const catalog = AI_EMPLOYEE_CATALOG[addOn.offerId];
      expect(addOn.offerName).toBe(catalog.name);
      expect(addOn.setupFeeUsd).toBe(catalog.setupFeeUsd);
      expect(addOn.monthlyFeeUsd).toBe(catalog.monthlyFeeUsd);
      expect(addOn.includedFeatures).toEqual([...catalog.includedFeatures]);
      expect(addOn.estimatedDelivery).toBe(catalog.estimatedDelivery);
    }
    expect(plan.recommendedAddOns.length).toBeLessThanOrEqual(2);
  });

  it("leaves bundle undefined for a plain diagnosis with no a-la-carte bundle passed in", () => {
    const input = { path: "existing_business" as const, missedCallsPerMonth: 10, medianLeadResponseMinutes: 20 };
    const diagnosis = diagnoseBusiness(input);
    const plan = buildFlightPlan(input, diagnosis);
    expect(plan.bundle).toBeUndefined();
  });

  it("routes regulated work to human review", () => {
    const input = { path: "existing_business" as const, missedCallsPerMonth: 5, riskCategories: ["legal_advice"] as const };
    const diagnosis = diagnoseBusiness(input);
    const plan = buildFlightPlan(input, diagnosis);
    expect(plan.nextAction).toBe("human_review");
    expect(plan.recommendation.autonomousCloseAllowed).toBe(false);
  });

  it("continues discovery when no meaningful bottleneck has been identified", () => {
    const input = { path: "startup" as const };
    const diagnosis = diagnoseBusiness(input);
    const plan = buildFlightPlan(input, diagnosis);
    expect(plan.nextAction).toBe("continue_discovery");
    expect(plan.recommendedAddOns).toEqual([]);
  });

  // Ascension funnel v2: futureUpgrades is hardcoded to [] until more ascension-
  // funnel products exist above Moonrock Launch Plan (see flight-plan.ts) - prior
  // fast-track-to-ai_workforce upgrade tests are in git history to bring back then.
  it("never suggests a futureUpgrade right now, even when fast-track signals or departmentsAffected would previously have triggered one", () => {
    const input = { path: "existing_business" as const, missedCallsPerMonth: 10, medianLeadResponseMinutes: 45, departmentsAffected: 2, businessChallenges: "We operate across 5 locations." };
    const diagnosis = diagnoseBusiness(input);
    const plan = buildFlightPlan(input, diagnosis);
    expect(plan.futureUpgrades).toEqual([]);
  });
});
