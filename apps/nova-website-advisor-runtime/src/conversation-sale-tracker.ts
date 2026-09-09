import type { AscensionLadderTier } from "./ascension-score.js";

export interface ConversationSaleRecord {
  offerId: string;
  offerName: string;
  ladderTier: AscensionLadderTier;
  setupFeeUsd: number;
  monthlyFeeUsd: number;
  closedAt: string;
}

export interface ConversationSaleTotal {
  /** Recurring commitment closed so far this conversation/session - what Section 9.2's $700/mo threshold checks against. */
  monthlyCommitmentUsd: number;
  /** One-time value closed so far. Tracked here (Section 6) ahead of Section 9.8's $999 one-time threshold, which amends this same running total rather than introducing a second tracker. */
  oneTimeValueUsd: number;
  saleCount: number;
}

/**
 * Set at $700/mo combined monthly commitment (Section 9.2), grounded just
 * under AI Workforce's $749/mo - the point past which several sequential
 * autonomous closes in one sitting would otherwise reach Workforce-level
 * commitment while bypassing Workforce's own mandatory human review.
 */
export const CUMULATIVE_MONTHLY_REVIEW_THRESHOLD_USD = 700;

/**
 * Sums every sale closed autonomously so far THIS conversation/session -
 * never a lifetime/cross-session total (that's purchaseHistory's job,
 * feeding computeAscensionScore instead). Deliberately a pure summation
 * over whatever the caller passes in, not a contactId/conversationId-keyed
 * lookup: this app has no persistent store keyed that way, so the running
 * conversation's own session state (DiscoverySessionState.conversationSalesClosed)
 * is the single source of truth, mirroring the ascensionScore precedent.
 */
export function getConversationSaleTotal(sales: readonly ConversationSaleRecord[]): ConversationSaleTotal {
  return {
    monthlyCommitmentUsd: sales.reduce((sum, sale) => sum + sale.monthlyFeeUsd, 0),
    oneTimeValueUsd: sales.reduce((sum, sale) => sum + sale.setupFeeUsd, 0),
    saleCount: sales.length,
  };
}

/**
 * Closes the Tier 5-stacking loophole: this reads the RUNNING total for the
 * whole conversation (getConversationSaleTotal, already inclusive of the
 * sale being considered), never a single bundle/offer's own price - so
 * several separate sequential closes in one sitting are held to the same
 * bar as one packaged Flight Plan would be. Strictly-greater-than: a total
 * that lands exactly on the threshold does not yet require review, only one
 * that exceeds it.
 */
export function requiresCumulativeValueReview(total: ConversationSaleTotal): boolean {
  return total.monthlyCommitmentUsd > CUMULATIVE_MONTHLY_REVIEW_THRESHOLD_USD;
}
