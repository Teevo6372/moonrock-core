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

  it("reports no violation when a Tier 0 product name/price is present in a get_tier0_catalog tool result", () => {
    const violations = verifyPriceProvenance(
      "The Missed-Call Money Leak Calculator is $17.",
      [{ id: "01", name: "The Missed-Call Money Leak Calculator", priceUsd: 17 }],
    );
    expect(violations).toEqual([]);
  });

  it("flags a Tier 0 product name mentioned but absent from any tool result this turn", () => {
    const violations = verifyPriceProvenance("Check out the SOP Starter Templates (10-Pack).", []);
    expect(violations.some((violation) => violation.includes("SOP Starter Templates (10-Pack)"))).toBe(true);
  });

  it("matches a name ending in a non-word character even mid-sentence, not just at a bare word boundary", () => {
    // Regression case: a plain \b...\b regex never matches a phrase ending in
    // ")" because \b requires a word/non-word transition, and ")" followed by
    // punctuation or whitespace is non-word on both sides.
    const violations = verifyPriceProvenance("Grab the Estimate/Quote Template Pack (5 Designs), it's great.", []);
    expect(violations.some((violation) => violation.includes("Estimate/Quote Template Pack (5 Designs)"))).toBe(true);
  });
});
