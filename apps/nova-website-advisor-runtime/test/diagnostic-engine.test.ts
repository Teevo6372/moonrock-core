import { describe, expect, it } from "vitest";

import { AI_EMPLOYEE_CATALOG, priceOffer } from "../src/ai-employee-catalog.js";
import { diagnoseBusiness } from "../src/diagnostic-engine.js";

describe("Nova diagnostic engine", () => {
  it("recommends Front Office when an existing business has multiple front-office bottlenecks", () => {
    const result = diagnoseBusiness({
      path: "existing_business",
      businessName: "ABC Plumbing",
      monthlyLeads: 45,
      missedCallsPerMonth: 12,
      averageJobValueUsd: 750,
      closeRatePercent: 30,
      medianLeadResponseMinutes: 25,
      appointmentsNeedManualScheduling: true,
      estimatesNeedManualFollowUp: true,
    });

    expect(result.recommendedOfferId).toBe("front_office");
    expect(result.autonomousCloseAllowed).toBe(true);
    expect(result.opportunityEstimate?.monthlyOpportunityUsd).toBe(2700);
    expect(result.bottlenecks[0]?.score).toBeGreaterThanOrEqual(70);
  });

  it("recommends Receptionist when missed calls are the primary isolated issue", () => {
    const result = diagnoseBusiness({
      path: "existing_business",
      missedCallsPerMonth: 8,
      averageJobValueUsd: 500,
      closeRatePercent: 25,
    });

    expect(result.recommendedOfferId).toBe("receptionist");
    expect(result.autonomousCloseAllowed).toBe(true);
  });

  it("escalates regulated workflows even when the package itself is standardized", () => {
    const result = diagnoseBusiness({
      path: "existing_business",
      missedCallsPerMonth: 10,
      riskCategories: ["healthcare_phi"],
    });

    expect(result.recommendedOfferId).toBe("receptionist");
    expect(result.autonomousCloseAllowed).toBe(false);
    expect(result.escalationReasons.join(" ")).toContain("healthcare_phi");
  });

  it("never autonomously closes the custom AI Workforce tier", () => {
    const result = diagnoseBusiness({
      path: "existing_business",
      departmentsAffected: 4,
    });

    expect(result.recommendedOfferId).toBe("ai_workforce");
    expect(AI_EMPLOYEE_CATALOG.ai_workforce.autonomousSaleAllowed).toBe(false);
    expect(result.autonomousCloseAllowed).toBe(false);
  });

  it("applies the approved founding-customer setup price without changing monthly price", () => {
    const standard = priceOffer("front_office");
    const founding = priceOffer("front_office", { foundingCustomer: true });

    expect(standard.setupFeeUsd).toBe(799);
    expect(founding.setupFeeUsd).toBe(399);
    expect(founding.monthlyFeeUsd).toBe(499);
  });

  it("flags prohibited use for refusal and blocks autonomous close", () => {
    const result = diagnoseBusiness({
      path: "startup",
      founderHandlesMostAdmin: true,
      riskCategories: ["illegal_or_abusive"],
    });

    expect(result.autonomousCloseAllowed).toBe(false);
    expect(result.escalationReasons[0]).toContain("REFUSE");
  });
});
