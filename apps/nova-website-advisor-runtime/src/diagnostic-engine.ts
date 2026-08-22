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
  businessChallenges?: string;
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

export interface BottleneckFinding { id: BottleneckId; score: number; reason: string; }
export interface OpportunityEstimate { monthlyOpportunityUsd: number; basis: string; disclaimer: string; }
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
  "healthcare_phi", "legal_advice", "financial_advice", "insurance_decisioning", "debt_collection", "emergency_response", "government", "children_sensitive_data", "employment_decisioning", "credit_decisioning", "high_risk_financial_transaction", "complex_enterprise", "high_volume", "custom_api",
]);
const FRONT_OFFICE_BOTTLENECKS = new Set<BottleneckId>(["missed_calls", "slow_lead_response", "lead_capture", "lead_qualification", "appointment_booking", "estimate_follow_up"]);

function addFinding(findings: BottleneckFinding[], id: BottleneckId, score: number, reason: string): void {
  findings.push({ id, score: Math.max(0, Math.min(100, score)), reason });
}

function scoreFindings(input: DiagnosticInput): BottleneckFinding[] {
  const findings: BottleneckFinding[] = [];
  if ((input.missedCallsPerMonth ?? 0) > 0) { const missed = input.missedCallsPerMonth ?? 0; addFinding(findings, "missed_calls", Math.min(100, 45 + missed * 4), `${missed} reported missed calls per month create a direct opportunity leak.`); }
  if ((input.medianLeadResponseMinutes ?? 0) > 15) { const response = input.medianLeadResponseMinutes ?? 0; addFinding(findings, "slow_lead_response", Math.min(100, 40 + response / 2), `Median lead response is about ${response} minutes, leaving high-intent inquiries waiting.`); }
  if ((input.monthlyLeads ?? 0) > 0 && input.path === "startup") addFinding(findings, "lead_capture", 58, "The startup expects active lead flow and needs a consistent capture-and-response path from launch.");
  if (input.appointmentsNeedManualScheduling) addFinding(findings, "appointment_booking", 68, "Appointment scheduling still requires manual coordination.");
  if (input.estimatesNeedManualFollowUp) addFinding(findings, "estimate_follow_up", 78, "Estimate or qualified-lead follow-up depends on manual memory and effort.");
  if (input.repetitiveSupportLoad === "high") addFinding(findings, "repetitive_support", 78, "Repetitive customer questions consume substantial staff capacity.");
  else if (input.repetitiveSupportLoad === "medium") addFinding(findings, "repetitive_support", 54, "Repetitive customer questions consume noticeable staff capacity.");
  if (input.reviewRequestProcess === "none") addFinding(findings, "review_generation", 66, "There is no consistent review-request process today.");
  else if (input.reviewRequestProcess === "manual") addFinding(findings, "review_generation", 48, "Review requests depend on manual follow-through.");
  if (input.dormantCustomerList) addFinding(findings, "reactivation", 72, "Past customers or dormant leads are available but not consistently re-engaged.");
  if (input.founderHandlesMostAdmin) addFinding(findings, "founder_capacity", 82, "The founder expects to carry calls, scheduling, follow-up, and customer administration personally.");
  if ((input.departmentsAffected ?? 0) >= 3) addFinding(findings, "multi_department", 76, "The reported bottlenecks span three or more business functions.");

  const challenges = input.businessChallenges?.toLowerCase() ?? "";
  if (challenges) {
    if (/miss(ed|ing)? calls?|phone|voicemail|after.?hours/.test(challenges) && !findings.some((item) => item.id === "missed_calls")) addFinding(findings, "missed_calls", 62, "The owner described phone coverage or missed-call friction as a current concern.");
    if (/follow.?up|quote|estimate|proposal|ghost|remember/.test(challenges) && !findings.some((item) => item.id === "estimate_follow_up")) addFinding(findings, "estimate_follow_up", 68, "The owner described inconsistent follow-up as a current operational concern.");
    if (/slow|response|lead|inquir/.test(challenges) && !findings.some((item) => item.id === "slow_lead_response")) addFinding(findings, "slow_lead_response", 60, "The owner described lead-response friction that is worth validating during implementation.");
    if (/schedule|booking|appointment/.test(challenges) && !findings.some((item) => item.id === "appointment_booking")) addFinding(findings, "appointment_booking", 58, "The owner described scheduling or booking friction as a current concern.");
    if (/repetitive|same questions|customer questions|support/.test(challenges) && !findings.some((item) => item.id === "repetitive_support")) addFinding(findings, "repetitive_support", 58, "The owner described repetitive customer-service work that may be suitable for automation.");
    if (/too much|overwhelm|wearing.*hats|no time|admin|busy/.test(challenges) && !findings.some((item) => item.id === "founder_capacity")) addFinding(findings, "founder_capacity", 64, "The owner described capacity pressure or repetitive administrative workload.");
  }
  return findings.sort((a, b) => b.score - a.score);
}

function estimateOpportunity(input: DiagnosticInput): OpportunityEstimate | undefined {
  const missedCalls = input.missedCallsPerMonth ?? 0; const averageJobValue = input.averageJobValueUsd ?? 0; const closeRate = input.closeRatePercent ?? 0;
  if (missedCalls <= 0 || averageJobValue <= 0 || closeRate <= 0) return undefined;
  const monthlyOpportunityUsd = Math.round(missedCalls * averageJobValue * (closeRate / 100));
  return { monthlyOpportunityUsd, basis: `${missedCalls} missed calls × $${averageJobValue} average value × ${closeRate}% reported close rate`, disclaimer: "Directional estimate based on information provided, not a revenue guarantee." };
}

function chooseOffer(findings: BottleneckFinding[]): AiEmployeeId {
  const ids = new Set(findings.map((finding) => finding.id));
  if (ids.has("multi_department")) return "ai_workforce";
  const frontOfficeCount = [...ids].filter((id) => FRONT_OFFICE_BOTTLENECKS.has(id)).length;
  if (frontOfficeCount >= 3) return "front_office";
  if (ids.has("missed_calls") || ids.has("appointment_booking")) return "receptionist";
  if (ids.has("estimate_follow_up") || ids.has("reactivation")) return "sales_follow_up";
  if (ids.has("slow_lead_response") || ids.has("lead_capture") || ids.has("lead_qualification")) return "lead_response";
  if (ids.has("repetitive_support")) return "customer_care";
  if (ids.has("review_generation") || ids.has("retention")) return "reputation_retention";
  return "front_office";
}

export function diagnoseBusiness(input: DiagnosticInput): DiagnosticResult {
  const bottlenecks = scoreFindings(input);
  const recommendedOfferId = chooseOffer(bottlenecks);
  const offer = AI_EMPLOYEE_CATALOG[recommendedOfferId];
  const escalationReasons: string[] = [];
  const risks = input.riskCategories ?? [];
  if (risks.includes("illegal_or_abusive")) escalationReasons.push("REFUSE: requested use appears illegal or abusive and must not be sold or automated.");
  for (const risk of risks) if (risk !== "illegal_or_abusive" && ESCALATION_RISKS.has(risk)) escalationReasons.push(`Risk category requires review: ${risk}`);
  if ((input.requestedCustomIntegrations ?? 0) > 2) escalationReasons.push("More than two custom integrations require solution review.");
  if ((input.expectedVoiceMinutesPerMonth ?? 0) > 5000) escalationReasons.push("High projected voice volume requires usage review.");
  const autonomousCloseAllowed = escalationReasons.length === 0 && offer.autonomousSaleAllowed;
  const top = bottlenecks.slice(0, 3).map((finding) => finding.id.replaceAll("_", " ")).join(", ");
  const recommendationReason = top ? `The strongest opportunities are ${top}. ${offer.name} is the best fit for that combination.` : `${offer.name} provides a practical starting point while Moonrock gathers more operating data.`;
  const opportunityEstimate = estimateOpportunity(input);
  return { path: input.path, bottlenecks, recommendedOfferId, recommendationReason, autonomousCloseAllowed, escalationReasons, ...(opportunityEstimate ? { opportunityEstimate } : {}) };
}
