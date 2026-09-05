import type { ServiceTier } from "./ai-employee-catalog.js";
import type { AscensionTier } from "./ala-carte-catalog.js";

export type AscensionBand = "cold" | "nurture" | "warm" | "hot";

export type AscensionLadderTier = AscensionTier | Exclude<ServiceTier, "ala_carte">;

export interface AscensionPurchaseRecord {
  tier: AscensionLadderTier;
  purchasedAt: string;
}

export interface AscensionConversationalSignals {
  budgetMentionedUsd?: number;
  teamSizeMentioned?: number;
  urgencyStated?: boolean;
  statedPainPoints?: readonly string[];
}

export interface AscensionScoreInput {
  purchaseHistory: readonly AscensionPurchaseRecord[];
  conversationalSignals: AscensionConversationalSignals;
  lastEngagementAt?: string;
  /** Injectable for deterministic tests; defaults to the real current time. */
  now?: string;
}

export interface AscensionScoreResult {
  score: number;
  band: AscensionBand;
  currentTier: AscensionLadderTier | null;
  eligibleNextTier: AscensionLadderTier | null;
  decayApplied: boolean;
  contributingFactors: string[];
}

// Resolved decision: documented default weights, named constants, tunable
// later once real conversation data exists - nothing else in the system
// depends on these exact numbers being right on day one.
const POINTS_PER_COMPLETED_TIER = 40;
const CONVERSATIONAL_SIGNAL_POINTS = 10;
const MAX_CONVERSATIONAL_SIGNAL_POINTS = 30;
const DECAY_GRACE_PERIOD_DAYS = 14;
const DECAY_RATE_PER_DAY = 2;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// The ascension ladder's linear order, for eligibleNextTier resolution only.
// ghl_saas is the agency/reseller path rather than a strict rung on this
// consumer-facing ladder, but is placed just below ai_employee since a large
// agency's own AI-employee-style needs are the natural next step up (see
// fast-track's numberOfClientsManaged threshold in a later step).
const TIER_LADDER: readonly AscensionLadderTier[] = ["trust_builder", "ascension_addon", "custom_build", "website_build", "ghl_saas", "ai_employee"];

function highestLadderTier(purchaseHistory: readonly AscensionPurchaseRecord[]): AscensionLadderTier | null {
  let best: AscensionLadderTier | null = null;
  let bestIndex = -1;
  for (const record of purchaseHistory) {
    const index = TIER_LADDER.indexOf(record.tier);
    if (index > bestIndex) {
      bestIndex = index;
      best = record.tier;
    }
  }
  return best;
}

function bandForScore(score: number): AscensionBand {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  if (score >= 10) return "nurture";
  return "cold";
}

/**
 * THE single place the ascension score is computed. Every consumer (GHL
 * sync, chat via dynamic-conversation-engine.ts, and any future SMS/email/
 * voice channel) must read this function's result - never recompute
 * independently. See the autonomousCloseAllowed incident this pattern
 * exists to prevent: two systems reporting the same fact, one silently
 * stale.
 */
export function computeAscensionScore(input: AscensionScoreInput): AscensionScoreResult {
  const contributingFactors: string[] = [];

  const purchasePoints = input.purchaseHistory.length * POINTS_PER_COMPLETED_TIER;
  if (input.purchaseHistory.length > 0) {
    contributingFactors.push(`${input.purchaseHistory.length} completed purchase(s) contribute ${purchasePoints} points.`);
  }

  const signals = input.conversationalSignals;
  let signalCount = 0;
  if (signals.budgetMentionedUsd !== undefined) { signalCount += 1; contributingFactors.push("Visitor stated a budget."); }
  if (signals.teamSizeMentioned !== undefined) { signalCount += 1; contributingFactors.push("Visitor stated a team size."); }
  if (signals.urgencyStated === true) { signalCount += 1; contributingFactors.push("Visitor expressed urgency."); }
  if (signals.statedPainPoints && signals.statedPainPoints.length > 0) { signalCount += 1; contributingFactors.push("Visitor stated specific pain points."); }
  const signalPoints = Math.min(signalCount * CONVERSATIONAL_SIGNAL_POINTS, MAX_CONVERSATIONAL_SIGNAL_POINTS);

  const now = new Date(input.now ?? new Date().toISOString()).getTime();
  let decayAmount = 0;
  let decayApplied = false;
  if (input.lastEngagementAt !== undefined) {
    const daysSinceEngagement = (now - new Date(input.lastEngagementAt).getTime()) / MS_PER_DAY;
    if (daysSinceEngagement > DECAY_GRACE_PERIOD_DAYS) {
      decayAmount = (daysSinceEngagement - DECAY_GRACE_PERIOD_DAYS) * DECAY_RATE_PER_DAY;
      decayApplied = true;
      contributingFactors.push(`Inactive for ${Math.round(daysSinceEngagement)} days, past the ${DECAY_GRACE_PERIOD_DAYS}-day grace period - score decayed by ${Math.round(decayAmount)} points.`);
    }
  }

  const score = Math.max(0, Math.min(100, Math.round(purchasePoints + signalPoints - decayAmount)));
  const currentTier = highestLadderTier(input.purchaseHistory);
  const ladderIndex = currentTier ? TIER_LADDER.indexOf(currentTier) : -1;
  const eligibleNextTier = ladderIndex + 1 < TIER_LADDER.length ? TIER_LADDER[ladderIndex + 1]! : null;

  return { score, band: bandForScore(score), currentTier, eligibleNextTier, decayApplied, contributingFactors };
}
