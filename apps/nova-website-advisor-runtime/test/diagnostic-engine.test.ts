import { describe, expect, it } from "vitest";

import { AI_EMPLOYEE_CATALOG, priceOffer } from "../src/ai-employee-catalog.js";
import { diagnoseBusiness } from "../src/diagnostic-engine.js";

describe("Nova diagnostic engine", () => {
  // Ascension funnel v2: chooseOffer always recommends moonrock_launch_plan
  // regardless of bottleneck findings (see diagnostic-engine.ts) - bottleneck
  // scoring and the opportunity estimate are untouched and still assert on real
  // signal-driven behavior. The prior bottleneck-to-offer branching (front_office/
  // receptionist/ai_workforce/etc.) is in git history to bring back once more
  // ascension-funnel products exist.
  it("still scores bottlenecks and the opportunity estimate correctly, even though every offer resolves to Moonrock Launch Plan", () => {
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

    expect(result.recommendedOfferId).toBe("moonrock_launch_plan");
    expect(result.autonomousCloseAllowed).toBe(true);
    expect(result.opportunityEstimate?.monthlyOpportunityUsd).toBe(2700);
    expect(result.bottlenecks[0]?.score).toBeGreaterThanOrEqual(70);
  });

  it("recommends Moonrock Launch Plan when missed calls are the primary isolated issue", () => {
    const result = diagnoseBusiness({
      path: "existing_business",
      missedCallsPerMonth: 8,
      averageJobValueUsd: 500,
      closeRatePercent: 25,
    });

    expect(result.recommendedOfferId).toBe("moonrock_launch_plan");
    expect(result.autonomousCloseAllowed).toBe(true);
  });

  it("escalates regulated workflows even when the package itself is standardized", () => {
    const result = diagnoseBusiness({
      path: "existing_business",
      missedCallsPerMonth: 10,
      riskCategories: ["healthcare_phi"],
    });

    expect(result.recommendedOfferId).toBe("moonrock_launch_plan");
    expect(result.autonomousCloseAllowed).toBe(false);
    expect(result.escalationReasons.join(" ")).toContain("healthcare_phi");
  });

  it("keeps AI Workforce marked non-autonomous in the catalog even though it's currently unreachable via chooseOffer", () => {
    expect(AI_EMPLOYEE_CATALOG.ai_workforce.autonomousSaleAllowed).toBe(false);

    const result = diagnoseBusiness({ path: "existing_business", departmentsAffected: 4 });
    expect(result.recommendedOfferId).toBe("moonrock_launch_plan");
    expect(result.autonomousCloseAllowed).toBe(true);
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
