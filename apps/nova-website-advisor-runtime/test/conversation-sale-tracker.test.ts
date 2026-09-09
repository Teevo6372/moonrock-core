import { describe, expect, it } from "vitest";
import {
  CUMULATIVE_MONTHLY_REVIEW_THRESHOLD_USD,
  CUMULATIVE_ONE_TIME_REVIEW_THRESHOLD_USD,
  getConversationSaleTotal,
  requiresCumulativeValueReview,
  requiresOneTimeValueReview,
  type ConversationSaleRecord,
} from "../src/conversation-sale-tracker.js";

function sale(overrides: Partial<ConversationSaleRecord> = {}): ConversationSaleRecord {
  return {
    offerId: "receptionist",
    offerName: "AI Receptionist",
    ladderTier: "ai_employee",
    setupFeeUsd: 0,
    monthlyFeeUsd: 249,
    closedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("getConversationSaleTotal", () => {
  it("returns zero for a conversation with no sales closed", () => {
    expect(getConversationSaleTotal([])).toEqual({ monthlyCommitmentUsd: 0, oneTimeValueUsd: 0, saleCount: 0 });
  });

  it("sums monthly and one-time value independently across every closed sale", () => {
    const total = getConversationSaleTotal([
      sale({ monthlyFeeUsd: 249, setupFeeUsd: 200 }),
      sale({ monthlyFeeUsd: 199, setupFeeUsd: 150 }),
    ]);
    expect(total).toEqual({ monthlyCommitmentUsd: 448, oneTimeValueUsd: 350, saleCount: 2 });
  });
});

describe("requiresCumulativeValueReview", () => {
  it("does not require review under the $700/mo threshold", () => {
    expect(requiresCumulativeValueReview(getConversationSaleTotal([sale({ monthlyFeeUsd: 249 }), sale({ monthlyFeeUsd: 199 })]))).toBe(false);
  });

  it("does not require review when the total lands exactly on the threshold", () => {
    expect(requiresCumulativeValueReview(getConversationSaleTotal([sale({ monthlyFeeUsd: CUMULATIVE_MONTHLY_REVIEW_THRESHOLD_USD })]))).toBe(false);
  });

  it("requires review once the combined monthly total exceeds $700/mo, closing the Tier 5-stacking loophole", () => {
    // Two AI Employee sales that individually would never trigger a Tier 6-style
    // review, but combined cross the threshold in one sitting.
    const total = getConversationSaleTotal([sale({ monthlyFeeUsd: 499 }), sale({ monthlyFeeUsd: 299 })]);
    expect(total.monthlyCommitmentUsd).toBe(798);
    expect(requiresCumulativeValueReview(total)).toBe(true);
  });

  it("checks the recurring monthly figure only, not one-time setup value", () => {
    const total = getConversationSaleTotal([sale({ monthlyFeeUsd: 0, setupFeeUsd: 5000 })]);
    expect(requiresCumulativeValueReview(total)).toBe(false);
  });
});

describe("requiresOneTimeValueReview - Section 9.8's amendment to Section 9.2", () => {
  it("does not require review under the $999 one-time threshold", () => {
    expect(requiresOneTimeValueReview(getConversationSaleTotal([sale({ setupFeeUsd: 500, monthlyFeeUsd: 0 })]))).toBe(false);
  });

  it("does not require review when the total lands exactly on the threshold", () => {
    expect(requiresOneTimeValueReview(getConversationSaleTotal([sale({ setupFeeUsd: CUMULATIVE_ONE_TIME_REVIEW_THRESHOLD_USD, monthlyFeeUsd: 0 })]))).toBe(false);
  });

  it("requires review once combined one-time value closed this conversation exceeds $999", () => {
    const total = getConversationSaleTotal([sale({ setupFeeUsd: 500, monthlyFeeUsd: 0 }), sale({ setupFeeUsd: 600, monthlyFeeUsd: 0 })]);
    expect(total.oneTimeValueUsd).toBe(1100);
    expect(requiresOneTimeValueReview(total)).toBe(true);
  });

  it("checks the one-time figure only, not recurring monthly commitment", () => {
    const total = getConversationSaleTotal([sale({ setupFeeUsd: 0, monthlyFeeUsd: 5000 })]);
    expect(requiresOneTimeValueReview(total)).toBe(false);
  });
});
