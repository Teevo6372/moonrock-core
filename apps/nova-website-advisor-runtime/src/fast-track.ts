import type { AlaCarteItemId } from "./ala-carte-catalog.js";
import { computeDirectEscalationReasons, type BottleneckFinding, type DiagnosticInput } from "./diagnostic-engine.js";

export type FastTrackTargetTier = "ai_employee" | "ai_workforce";

export interface FastTrackEvaluation {
  fastTrackEligible: boolean;
  targetTier: FastTrackTargetTier | null;
  reasons: string[];
  /** Resolved decision: Nova frames Trust Builder's existing no-setup-fee
   *  structure as the fast-track opener rather than inventing a $0/month
   *  item, since Tier 0 (truly free) is out of scope. */
  openingOfferItemId: AlaCarteItemId | null;
}

// New Section 4 thresholds - resolved with the spec owner (50 clients / a
// $1,000 stated budget ceiling), since the spec didn't state exact numbers.
const AGENCY_CLIENT_VOLUME_THRESHOLD = 50;
const HIGH_BUDGET_CEILING_THRESHOLD_USD = 1000;

const ROLE_REPLACEMENT_SIGNAL = /replace (a|an|our|my) (role|employee|position|person|receptionist|rep)|instead of hiring/i;
const TEAM_OF_AGENTS_SIGNAL = /team of agents|fleet of (ai )?agents|multiple ai (agents|employees)|full ai (team|workforce)/i;
const MULTI_LOCATION_SIGNAL = /multiple locations|\d+\s*locations|franchise|multi.?location|high.?volume operation/i;

/**
 * Cross-tier fast-track evaluation: should this lead (regardless of which
 * tier they entered through) be offered AI Employees/Flight Plans/AI
 * Workforce early? This reuses, rather than duplicates, diagnoseBusiness's
 * two existing escalation mechanisms:
 *  - the direct one (computeDirectEscalationReasons: risk categories, custom
 *    integrations, voice volume)
 *  - the indirect one (a multi_department bottleneck finding, which
 *    diagnoseBusiness's chooseOffer separately routes to ai_workforce) -
 *    mirrored here read-only by checking bottlenecks, never by calling
 *    chooseOffer, so this never conflicts with or duplicates that routing
 *    decision.
 *
 * Deliberately distinct from DiagnosticResult.autonomousCloseAllowed: that
 * field gates whether an already-recommended ai_employee sale can close
 * without a human. This one asks whether a Tier 1-3 lead should be shown a
 * premium tier early. Merging the two would recreate the incident's failure
 * mode in reverse - conflating two genuinely different facts under one name.
 */
export function evaluateFastTrack(input: DiagnosticInput, bottlenecks: readonly BottleneckFinding[]): FastTrackEvaluation {
  const reasons = [...computeDirectEscalationReasons(input)];

  const hasMultiDepartmentSignal = bottlenecks.some((finding) => finding.id === "multi_department");
  if (hasMultiDepartmentSignal) reasons.push("Reported bottlenecks span three or more business functions.");

  if ((input.numberOfClientsManaged ?? 0) > AGENCY_CLIENT_VOLUME_THRESHOLD) {
    reasons.push("Client volume well above the standard GHL SaaS reseller range.");
  }
  if ((input.budgetCeilingMonthlyUsd ?? 0) > HIGH_BUDGET_CEILING_THRESHOLD_USD) {
    reasons.push("Stated budget ceiling well above entry-tier norms.");
  }

  const challenges = input.businessChallenges ?? "";
  const hasRoleReplacementSignal = ROLE_REPLACEMENT_SIGNAL.test(challenges);
  const hasTeamOfAgentsSignal = TEAM_OF_AGENTS_SIGNAL.test(challenges);
  const hasMultiLocationSignal = MULTI_LOCATION_SIGNAL.test(challenges);
  if (hasRoleReplacementSignal) reasons.push("Visitor language indicates replacing a role with AI.");
  if (hasTeamOfAgentsSignal) reasons.push("Visitor language indicates scaling with a team of AI agents.");
  if (hasMultiLocationSignal) reasons.push("Visitor described multi-location or high-volume operations.");

  const fastTrackEligible = reasons.length > 0;
  // Documented default assumption (resolved as "use my defaults" per the
  // spec owner): only the highest-severity signals route to ai_workforce;
  // everything else routes to ai_employee. Retune if agency-scale leads
  // (numberOfClientsManaged) should also route to ai_workforce.
  const targetTier: FastTrackTargetTier | null = !fastTrackEligible
    ? null
    : hasMultiDepartmentSignal || hasMultiLocationSignal || hasTeamOfAgentsSignal
      ? "ai_workforce"
      : "ai_employee";

  return {
    fastTrackEligible,
    targetTier,
    reasons,
    openingOfferItemId: fastTrackEligible ? "crm_pipeline" : null,
  };
}
