import { describe, expect, it } from "vitest";
import { computeAscensionScore } from "../src/ascension-score.js";

const NOW = "2026-01-15T00:00:00.000Z";

describe("computeAscensionScore", () => {
  it("scores zero for a brand-new contact with no history and no signals", () => {
    const result = computeAscensionScore({ purchaseHistory: [], conversationalSignals: {}, now: NOW });
    expect(result.score).toBe(0);
    expect(result.band).toBe("cold");
    expect(result.currentTier).toBeNull();
    expect(result.decayApplied).toBe(false);
  });

  it("increases the score for each completed purchase", () => {
    const one = computeAscensionScore({ purchaseHistory: [{ tier: "trust_builder", purchasedAt: NOW }], conversationalSignals: {}, now: NOW });
    const two = computeAscensionScore({ purchaseHistory: [{ tier: "trust_builder", purchasedAt: NOW }, { tier: "ascension_addon", purchasedAt: NOW }], conversationalSignals: {}, now: NOW });
    expect(two.score).toBeGreaterThan(one.score);
  });

  it("reports currentTier as the highest tier reached on the ladder, regardless of purchase order", () => {
    const result = computeAscensionScore({
      purchaseHistory: [
        { tier: "custom_build", purchasedAt: NOW },
        { tier: "trust_builder", purchasedAt: NOW },
      ],
      conversationalSignals: {},
      now: NOW,
    });
    expect(result.currentTier).toBe("custom_build");
  });

  it("resolves eligibleNextTier as the next rung up the ladder", () => {
    const result = computeAscensionScore({ purchaseHistory: [{ tier: "trust_builder", purchasedAt: NOW }], conversationalSignals: {}, now: NOW });
    expect(result.eligibleNextTier).toBe("ascension_addon");
  });

  it("returns null eligibleNextTier once already at the top of the ladder", () => {
    const result = computeAscensionScore({ purchaseHistory: [{ tier: "ai_employee", purchasedAt: NOW }], conversationalSignals: {}, now: NOW });
    expect(result.eligibleNextTier).toBeNull();
  });

  it("adds bounded points for conversational signals without any purchase history", () => {
    const noSignals = computeAscensionScore({ purchaseHistory: [], conversationalSignals: {}, now: NOW });
    const withSignals = computeAscensionScore({
      purchaseHistory: [],
      conversationalSignals: { budgetMentionedUsd: 500, teamSizeMentioned: 5, urgencyStated: true, statedPainPoints: ["missed calls"] },
      now: NOW,
    });
    expect(withSignals.score).toBeGreaterThan(noSignals.score);
    expect(withSignals.score).toBeLessThan(100);
  });

  it("does not decay a score within the grace period", () => {
    const result = computeAscensionScore({
      purchaseHistory: [{ tier: "trust_builder", purchasedAt: NOW }],
      conversationalSignals: {},
      lastEngagementAt: "2026-01-10T00:00:00.000Z",
      now: NOW,
    });
    expect(result.decayApplied).toBe(false);
  });

  it("decays a score after the inactivity grace period", () => {
    const fresh = computeAscensionScore({
      purchaseHistory: [{ tier: "trust_builder", purchasedAt: NOW }],
      conversationalSignals: {},
      lastEngagementAt: NOW,
      now: NOW,
    });
    const stale = computeAscensionScore({
      purchaseHistory: [{ tier: "trust_builder", purchasedAt: NOW }],
      conversationalSignals: {},
      lastEngagementAt: "2025-12-01T00:00:00.000Z",
      now: NOW,
    });
    expect(stale.decayApplied).toBe(true);
    expect(stale.score).toBeLessThan(fresh.score);
  });

  it("never returns a score outside 0-100", () => {
    const result = computeAscensionScore({
      purchaseHistory: [
        { tier: "trust_builder", purchasedAt: NOW },
        { tier: "ascension_addon", purchasedAt: NOW },
        { tier: "custom_build", purchasedAt: NOW },
        { tier: "website_build", purchasedAt: NOW },
      ],
      conversationalSignals: { budgetMentionedUsd: 5000, teamSizeMentioned: 50, urgencyStated: true, statedPainPoints: ["a", "b"] },
      now: NOW,
    });
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it("assigns bands consistently with the score", () => {
    expect(computeAscensionScore({ purchaseHistory: [], conversationalSignals: {}, now: NOW }).band).toBe("cold");
    expect(computeAscensionScore({ purchaseHistory: [], conversationalSignals: { urgencyStated: true, teamSizeMentioned: 3 }, now: NOW }).band).toBe("nurture");
    expect(computeAscensionScore({ purchaseHistory: [{ tier: "trust_builder", purchasedAt: NOW }], conversationalSignals: {}, now: NOW }).band).toBe("warm");
    expect(computeAscensionScore({ purchaseHistory: [{ tier: "trust_builder", purchasedAt: NOW }, { tier: "ascension_addon", purchasedAt: NOW }], conversationalSignals: {}, now: NOW }).band).toBe("hot");
  });
});
