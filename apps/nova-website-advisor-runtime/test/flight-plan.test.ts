import { describe, expect, it } from "vitest";

import { diagnoseBusiness } from "../src/diagnostic-engine.js";
import { buildFlightPlan } from "../src/flight-plan.js";

describe("Nova Flight Plan", () => {
  it("builds a purchase-ready existing-business plan using approved founding pricing", () => {
    const input = {
      path: "existing_business" as const,
      businessName: "ABC Plumbing",
      missedCallsPerMonth: 10,
      medianLeadResponseMinutes: 20,
      averageJobValueUsd: 800,
      closeRatePercent: 25,
    };
    const diagnosis = diagnoseBusiness(input);
    const plan = buildFlightPlan(input, diagnosis, { foundingCustomer: true });

    expect(plan.headline).toBe("Your Moonrock Growth Flight Plan");
    expect(plan.recommendation.offerId).toBe("front_office");
    expect(plan.recommendation.setupFeeUsd).toBe(399);
    expect(plan.recommendation.monthlyFeeUsd).toBe(499);
    expect(plan.nextAction).toBe("purchase");
    expect(plan.opportunity?.monthlyOpportunityUsd).toBe(2000);
  });

  it("routes regulated work to human review", () => {
    const input = {
      path: "existing_business" as const,
      missedCallsPerMonth: 5,
      riskCategories: ["legal_advice"] as const,
    };
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
  });
});
