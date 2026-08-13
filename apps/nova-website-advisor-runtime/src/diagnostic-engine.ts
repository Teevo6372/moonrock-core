import { AI_EMPLOYEE_CATALOG, type AiEmployeeId } from "./ai-employee-catalog.js";

export type BusinessPath = "startup" | "existing_business";

export type BottleneckId =
  | "missed_calls"
  | "slow_lead_response"
  | "lead_capture"
  | "lead_qualification"
  | "appointment_booking"
  | "estimate_follow_up"
  | "repetitive_support"
  | "review_generation"
  | "retention"
  | "reactivation"
  | "founder_capacity"
  | "multi_department";

export type RiskCategory =
  | "healthcare_phi"
  | "legal_advice"
  | "financial_advice"
  | "insurance_decisioning"
  | "debt_collection"
  | "emergency_response"
  | "government"
  | "children_sensitive_data"
  | "employment_decisioning"
  | "credit_decisioning"
  | "high_risk_financial_transaction"
  | "complex_enterprise"
  | "high_volume"
  | "custom_api"
  | "illegal_or_abusive";

export interface DiagnosticInput {
  path: BusinessPath;
  businessName?: string;
  industry?: string;
  monthlyLeads?: number;
  missedCallsPerMonth?: number;
  averageJobValueUsd?: number;
  closeRatePercent?: number;
  medianLeadResponseMinutes?: number;
  appointmentsNeedManualScheduling?: boolean;
  estimatesNeedManualFollowUp?: boolean;
  repetitiveSupportLoad?: "low" | "medium" | "high";
  reviewRequestProcess?: "none" | "manual" | "automated";
  dormantCustomerList?: boolean;
  founderHandlesMostAdmin?: boolean;
  departmentsAffected?: number;
  requestedCustomIntegrations?: number;
  expectedVoiceMinutesPerMonth?: number;
  riskCategories?: readonly RiskCategory[];
}

export interface BottleneckFinding {
  id: BottleneckId;
  score: number;
  reason: string;
}

export interface OpportunityEstimate {
  monthlyOpportunityUsd: number;
  basis: string;
  disclaimer: string;
}

export interface DiagnosticResult {
  path: BusinessPath;
  bottlenecks: BottleneckFinding[];
  recommendedOfferId: AiEmployeeId;
  recommendationReason: string;
  autonomousCloseAllowed: boolean;
  escalationReasons: string[];
  opportunityEstimate?: OpportunityEstimate;
}

const ESCALATION_RISKS = new Set<RiskCategory>([
  "healthcare_phi",
  "legal_advice",
  "financial_advice",
  "insurance_decisioning",
  "debt_collection",
  "emergency_response",
  "government",
  "children_sensitive_data",
  "employment_decisioning",
  "credit_decisioning",
  "high_risk_financial_transaction",
  "complex_enterprise",
  "high_volume",
  "custom_api",
]);

function addFinding(
  findings: BottleneckFinding[],
  id: BottleneckId,
  score: number,
  reason: string,
): void {
  findings.push({ id, score: Math.max(0, Math.min(100, score)), reason });
}

function scoreFindings(input: DiagnosticInput): BottleneckFinding[] {
  const findings: BottleneckFinding[] = [];

  if ((input.missedCallsPerMonth ?? 0) > 0) {
    const missed = input.missedCallsPerMonth ?? 0;
    addFinding(findings, "missed_calls", Math.min(100, 45 + missed * 4), `${missed} reported missed calls per month create a direct opportunity leak.`);
  }

  if ((input.medianLeadResponseMinutes ?? 0) >= 10) {
    const minutes = input.medianLeadResponseMinutes ?? 0;
    addFinding(findings, "slow_lead_response", Math.min(100, 40 + Math.floor(minutes / 5)), `Median lead response is about ${minutes} minutes, indicating response friction.`);
  }

  if (input.appointmentsNeedManualScheduling) {
    addFinding(findings, "appointment_booking", 65, "Appointments require manual scheduling and create avoidable administrative work.");
  }

  if (input.estimatesNeedManualFollowUp) {
    addFinding(findings, "estimate_follow_up", 75, "Estimates or proposals rely on manual follow-up, creating inconsistent sales coverage.");
  }

  if (input.repetitiveSupportLoad === "medium") {
    addFinding(findings, "repetitive_support", 55, "A meaningful share of staff time is spent on repetitive customer questions.");
  } else if (input.repetitiveSupportLoad === "high") {
    addFinding(findings, "repetitive_support", 80, "A high share of staff time is spent on repetitive customer questions.");
  }

  if (input.reviewRequestProcess === "none") {
    addFinding(findings, "review_generation", 70, "There is no consistent review-request process after service completion.");
  } else if (input.reviewRequestProcess === "manual") {
    addFinding(findings, "review_generation", 50, "Review requests depend on manual staff action and may be inconsistent.");
  }

  if (input.dormantCustomerList) {
    addFinding(findings, "reactivation", 60, "Existing customer or dormant lead data may support structured reactivation.");
  }

  if (input.path === "startup" && input.founderHandlesMostAdmin) {
    addFinding(findings, "founder_capacity", 75, "The founder expects to carry most administrative work, creating an early scaling bottleneck.");
  }

  if ((input.departmentsAffected ?? 1) >= 3) {
    addFinding(findings, "multi_department", 85, "Multiple departments or business functions require coordinated automation.");
  }

  return findings.sort((a, b) => b.score - a.score);
}

function chooseOffer(findings: readonly BottleneckFinding[]): AiEmployeeId {
  const ids = new Set(findings.map((finding) => finding.id));

  if (ids.has("multi_department")) return "ai_workforce";

  const frontOfficeSignals = ["missed_calls", "slow_lead_response", "appointment_booking", "estimate_follow_up"].filter((id) => ids.has(id as BottleneckId));
  if (frontOfficeSignals.length >= 2) return "front_office";

  if (ids.has("missed_calls") || ids.has("appointment_booking")) return "receptionist";
  if (ids.has("estimate_follow_up") || ids.has("reactivation")) return "sales_follow_up";
  if (ids.has("slow_lead_response") || ids.has("lead_capture") || ids.has("lead_qualification")) return "lead_response";
  if (ids.has("repetitive_support")) return "customer_care";
  if (ids.has("review_generation") || ids.has("retention")) return "reputation_retention";

  return "lead_response";
}

function estimateOpportunity(input: DiagnosticInput): OpportunityEstimate | undefined {
  const missedCalls = input.missedCallsPerMonth;
  const closeRatePercent = input.closeRatePercent;
  const averageJobValueUsd = input.averageJobValueUsd;

  if (missedCalls === undefined || closeRatePercent === undefined || averageJobValueUsd === undefined) {
    return undefined;
  }

  const monthlyOpportunityUsd = Math.round(missedCalls * (closeRatePercent / 100) * averageJobValueUsd);
  return {
    monthlyOpportunityUsd,
    basis: `${missedCalls} missed calls × ${closeRatePercent}% reported close rate × $${averageJobValueUsd} average job value`,
    disclaimer: "Estimated opportunity based only on information provided by the visitor; Moonrock does not guarantee revenue or ROI.",
  };
}

export function diagnoseBusiness(input: DiagnosticInput): DiagnosticResult {
  const findings = scoreFindings(input);
  const recommendedOfferId = chooseOffer(findings);
  const escalationReasons: string[] = [];
  const risks = input.riskCategories ?? [];

  if (risks.includes("illegal_or_abusive")) {
    escalationReasons.push("REFUSE: requested use appears illegal, deceptive, abusive, or otherwise prohibited.");
  }

  for (const risk of risks) {
    if (ESCALATION_RISKS.has(risk)) escalationReasons.push(`Human review required for risk category: ${risk}.`);
  }

  if ((input.requestedCustomIntegrations ?? 0) >= 2) {
    escalationReasons.push("Human review required for multiple custom integrations.");
  }

  if ((input.expectedVoiceMinutesPerMonth ?? 0) > 2000) {
    escalationReasons.push("Human review required for unusually high expected voice volume.");
  }

  const offer = AI_EMPLOYEE_CATALOG[recommendedOfferId];
  const autonomousCloseAllowed = offer.autonomousSaleAllowed && escalationReasons.length === 0;
  const primary = findings[0];
  const recommendationReason = primary
    ? `${offer.name} is the smallest approved Moonrock offer that addresses the strongest detected bottlenecks, led by ${primary.id.replaceAll("_", " ")}.`
    : `${offer.name} is the default entry recommendation pending additional discovery.`;

  return {
    path: input.path,
    bottlenecks: findings,
    recommendedOfferId,
    recommendationReason,
    autonomousCloseAllowed,
    escalationReasons,
    ...(estimateOpportunity(input) ? { opportunityEstimate: estimateOpportunity(input) } : {}),
  };
}
