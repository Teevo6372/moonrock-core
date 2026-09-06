import { describe, expect, it } from "vitest";
import { verifyPriceProvenance } from "../src/price-provenance-guardrail.js";

describe("verifyPriceProvenance", () => {
  it("reports no violations when the reply mentions no dollar amounts or catalog names", () => {
    const violations = verifyPriceProvenance("Sure, tell me more about the biggest headache you're trying to fix.", []);
    expect(violations).toEqual([]);
  });

  it("reports no violation when a dollar amount is present verbatim in a tool result", () => {
    const violations = verifyPriceProvenance("That comes to $749/month.", [{ monthlyFeeUsd: 749 }]);
    expect(violations).toEqual([]);
  });

  it("flags a dollar amount not present in any tool result this turn", () => {
    const violations = verifyPriceProvenance("That comes to $749/month.", [{ monthlyFeeUsd: 199 }]);
    expect(violations.length).toBe(1);
    expect(violations[0]).toContain("$749");
  });

  it("normalizes formatting when comparing amounts ($749 vs $749.00 vs $ 749 vs comma-grouped)", () => {
    expect(verifyPriceProvenance("It's $1,499 total.", [{ setupFeeUsd: 1499 }])).toEqual([]);
    expect(verifyPriceProvenance("It's $ 749 per month.", [{ monthlyFeeUsd: 749 }])).toEqual([]);
    expect(verifyPriceProvenance("It's $749.00 per month.", [{ monthlyFeeUsd: "749" }])).toEqual([]);
  });

  it("reports no violation when a catalog offer name is present in a tool result", () => {
    const violations = verifyPriceProvenance("I'd recommend the AI Receptionist for this.", [{ recommendedOfferId: "receptionist", offerName: "AI Receptionist" }]);
    expect(violations).toEqual([]);
  });

  it("flags a catalog offer name mentioned but absent from any tool result this turn", () => {
    const violations = verifyPriceProvenance("I'd recommend Moonrock AI Workforce for this.", [{ offerName: "AI Receptionist" }]);
    expect(violations.some((violation) => violation.includes("Moonrock AI Workforce"))).toBe(true);
  });

  it("can report multiple independent violations in one reply", () => {
    const violations = verifyPriceProvenance("Moonrock AI Workforce runs $749/month.", []);
    expect(violations.length).toBe(2);
  });
});
