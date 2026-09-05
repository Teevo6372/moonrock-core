import {
  AI_EMPLOYEE_CATALOG,
  GHL_SAAS_CATALOG,
  WEBSITE_BUILD_CATALOG,
  type AiEmployeeId,
  type GhlSaasId,
  type ServiceTier,
  type WebsiteBuildId,
} from "./ai-employee-catalog.js";
import type { AlaCarteItemId } from "./ala-carte-catalog.js";

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
  | "multi_department"
  | "website_scope_gap"
  | "agency_client_load";

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
  // Signals for tier classification (§4 of the service-tier plan). Optional
  // and unread by diagnoseBusiness/scoreFindings/chooseOffer, so the
  // ai_employee path is unaffected by these fields existing.
  hasExistingWebsite?: boolean;
  websiteScopeNeeded?: "landing_page" | "multi_page" | "ecommerce";
  websiteMustHaves?: string;
  hasApprovedBrandAssets?: boolean;
  isAgencyOrReseller?: boolean;
  numberOfClientsManaged?: number;
  // Stated post-recommendation budget ceiling (§ budget-aware revision).
  // Consulted by diagnoseBusiness's and diagnoseGhlSaas's offer selection;
  // scoreFindings/chooseOffer/bottleneck logic is unaffected when unset.
  budgetCeilingMonthlyUsd?: number;
  // One-time-setup equivalent of budgetCeilingMonthlyUsd, consulted only by
  // diagnoseWebsiteBuild (Website Build is a one-time setup fee, not a
  // monthly subscription, so it needs its own budget-ceiling field).
  setupBudgetCeilingUsd?: number;
  // Ascension funnel (ala_carte tier + cross-tier bundling, see
  // ascension-bundle.ts). Additive and unread by diagnoseBusiness/
  // scoreFindings/chooseOffer/diagnoseWebsiteBuild/diagnoseGhlSaas above.
  alaCarteItemsRequested?: readonly AlaCarteItemId[];
  hasExistingCrm?: boolean;
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
  const crossesPhoneAndDigitalResponse = ids.has("missed_calls") && (ids.has("slow_lead_response") || ids.has("lead_capture") || ids.has("lead_qualification"));
  if (frontOfficeCount >= 3 || crossesPhoneAndDigitalResponse) return "front_office";
  if (ids.has("missed_calls") || ids.has("appointment_booking")) return "receptionist";
  if (ids.has("estimate_follow_up") || ids.has("reactivation")) return "sales_follow_up";
  if (ids.has("slow_lead_response") || ids.has("lead_capture") || ids.has("lead_qualification")) return "lead_response";
  if (ids.has("repetitive_support")) return "customer_care";
  if (ids.has("review_generation") || ids.has("retention")) return "reputation_retention";
  return "front_office";
}

export interface BudgetFitOffer { offerId: AiEmployeeId; fitsWithinBudget: boolean; cheapestMonthlyFeeUsd: number; }

/** Picks the highest-value catalog offer at or under a stated monthly budget. If nothing fits, returns the cheapest documented offer with fitsWithinBudget:false so callers can be honest about the catalog floor rather than inventing a discount. */
export function chooseOfferWithinBudget(budgetCeilingUsd: number): BudgetFitOffer {
  const byPrice = Object.values(AI_EMPLOYEE_CATALOG).slice().sort((a, b) => a.monthlyFeeUsd - b.monthlyFeeUsd);
  const cheapest = byPrice[0]!;
  const withinBudget = byPrice.filter((offer) => offer.monthlyFeeUsd <= budgetCeilingUsd);
  if (withinBudget.length === 0) return { offerId: cheapest.id, fitsWithinBudget: false, cheapestMonthlyFeeUsd: cheapest.monthlyFeeUsd };
  const best = withinBudget[withinBudget.length - 1]!;
  return { offerId: best.id, fitsWithinBudget: true, cheapestMonthlyFeeUsd: cheapest.monthlyFeeUsd };
}

const BUDGET_OBJECTION_CUE = /\bafford|\bbudget|too (?:expensive|much|pricey)|can'?t (?:swing|justify|do)|cheaper|smaller (?:plan|option|package|tier)|tight on (?:cash|budget|money)|out of (?:my|our) (?:price range|budget)/i;
const MONTHLY_AMOUNT_PATTERN = /\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:\/|\s*(?:a|per)\s*)?\s*(?:month|mo\b|\/mo)/i;
const AFFORD_AMOUNT_PATTERN = /(?:afford|budget(?:\s+is)?|spend|pay)\D{0,15}?\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/i;

/** Deterministic (non-LLM) extraction of a stated monthly budget from free text, gated behind a budget-objection cue so an unrelated dollar amount in conversation doesn't get misread as a budget ceiling. */
export function extractStatedMonthlyBudgetUsd(text: string): number | undefined {
  if (!BUDGET_OBJECTION_CUE.test(text)) return undefined;
  const monthly = text.match(MONTHLY_AMOUNT_PATTERN);
  if (monthly) return Number(monthly[1]!.replace(/,/g, ""));
  const afford = text.match(AFFORD_AMOUNT_PATTERN);
  if (afford) return Number(afford[1]!.replace(/,/g, ""));
  return undefined;
}

const ONE_TIME_AMOUNT_PATTERN = /\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:total|one-?time|upfront|flat)/i;
const AFFORD_ONE_TIME_AMOUNT_PATTERN = /(?:afford|budget(?:\s+is)?|spend|pay)\D{0,15}?\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/i;

/** Deterministic (non-LLM) extraction of a stated one-time setup budget from
 *  free text, for Website Build objections (a one-time fee, not a monthly
 *  price - so it needs its own amount pattern rather than reusing
 *  extractStatedMonthlyBudgetUsd's monthly-shaped one). Gated behind the same
 *  budget-objection cue. */
export function extractStatedSetupBudgetUsd(text: string): number | undefined {
  if (!BUDGET_OBJECTION_CUE.test(text)) return undefined;
  const total = text.match(ONE_TIME_AMOUNT_PATTERN);
  if (total) return Number(total[1]!.replace(/,/g, ""));
  const afford = text.match(AFFORD_ONE_TIME_AMOUNT_PATTERN);
  if (afford) return Number(afford[1]!.replace(/,/g, ""));
  return undefined;
}

export interface WebsiteBudgetFitOffer { offerId: WebsiteBuildId; fitsWithinBudget: boolean; cheapestSetupFeeUsd: number; }

/** Picks the highest-value Website Build catalog offer at or under a stated
 *  one-time setup budget. Mirrors chooseOfferWithinBudget's honesty-over-
 *  invented-discount behavior. */
export function chooseWebsiteBuildOfferWithinBudget(setupBudgetUsd: number): WebsiteBudgetFitOffer {
  const byPrice = Object.values(WEBSITE_BUILD_CATALOG).slice().sort((a, b) => a.setupFeeUsd - b.setupFeeUsd);
  const cheapest = byPrice[0]!;
  const withinBudget = byPrice.filter((offer) => offer.setupFeeUsd <= setupBudgetUsd);
  if (withinBudget.length === 0) return { offerId: cheapest.id, fitsWithinBudget: false, cheapestSetupFeeUsd: cheapest.setupFeeUsd };
  const best = withinBudget[withinBudget.length - 1]!;
  return { offerId: best.id, fitsWithinBudget: true, cheapestSetupFeeUsd: cheapest.setupFeeUsd };
}

export interface GhlSaasBudgetFitOffer { offerId: GhlSaasId; fitsWithinBudget: boolean; cheapestMonthlyFeeUsd: number; }

/** Picks the highest-value GHL SaaS catalog offer at or under a stated
 *  monthly budget. Mirrors chooseOfferWithinBudget's honesty-over-invented-
 *  discount behavior. */
export function chooseGhlSaasOfferWithinBudget(budgetCeilingUsd: number): GhlSaasBudgetFitOffer {
  const byPrice = Object.values(GHL_SAAS_CATALOG).slice().sort((a, b) => a.monthlyFeeUsd - b.monthlyFeeUsd);
  const cheapest = byPrice[0]!;
  const withinBudget = byPrice.filter((offer) => offer.monthlyFeeUsd <= budgetCeilingUsd);
  if (withinBudget.length === 0) return { offerId: cheapest.id, fitsWithinBudget: false, cheapestMonthlyFeeUsd: cheapest.monthlyFeeUsd };
  const best = withinBudget[withinBudget.length - 1]!;
  return { offerId: best.id, fitsWithinBudget: true, cheapestMonthlyFeeUsd: cheapest.monthlyFeeUsd };
}

/**
 * The direct-escalation mechanism: signals that push straight into
 * escalationReasons and gate autonomousCloseAllowed. Extracted from
 * diagnoseBusiness (behavior-identical - same three checks, same order, same
 * strings) so fast-track.ts's evaluateFastTrack can reuse this exact logic
 * rather than duplicating it. Note this is one of two distinct escalation
 * mechanisms in this file - the other (multi_department routing offers to
 * ai_workforce via chooseOffer) works indirectly through offer selection,
 * not through this list. See fast-track.ts for where both are reconciled.
 */
export function computeDirectEscalationReasons(input: DiagnosticInput): string[] {
  const escalationReasons: string[] = [];
  const risks = input.riskCategories ?? [];
  if (risks.includes("illegal_or_abusive")) escalationReasons.push("REFUSE: requested use appears illegal or abusive and must not be sold or automated.");
  for (const risk of risks) if (risk !== "illegal_or_abusive" && ESCALATION_RISKS.has(risk)) escalationReasons.push(`Risk category requires review: ${risk}`);
  if ((input.requestedCustomIntegrations ?? 0) > 2) escalationReasons.push("More than two custom integrations require solution review.");
  if ((input.expectedVoiceMinutesPerMonth ?? 0) > 5000) escalationReasons.push("High projected voice volume requires usage review.");
  return escalationReasons;
}

export function diagnoseBusiness(input: DiagnosticInput): DiagnosticResult {
  const bottlenecks = scoreFindings(input);
  const needBasedOfferId = chooseOffer(bottlenecks);
  let recommendedOfferId = needBasedOfferId;
  let budgetNote: string | undefined;
  if (input.budgetCeilingMonthlyUsd !== undefined && AI_EMPLOYEE_CATALOG[needBasedOfferId].monthlyFeeUsd > input.budgetCeilingMonthlyUsd) {
    const budgetFit = chooseOfferWithinBudget(input.budgetCeilingMonthlyUsd);
    recommendedOfferId = budgetFit.offerId;
    budgetNote = budgetFit.fitsWithinBudget
      ? `That fits inside a stated $${input.budgetCeilingMonthlyUsd}/month budget.`
      : `Even Moonrock's most affordable AI Employee option runs $${budgetFit.cheapestMonthlyFeeUsd}/month; that is the published catalog floor, not a discount.`;
  }
  const offer = AI_EMPLOYEE_CATALOG[recommendedOfferId];
  const escalationReasons = computeDirectEscalationReasons(input);
  const autonomousCloseAllowed = escalationReasons.length === 0 && offer.autonomousSaleAllowed;
  const top = bottlenecks.slice(0, 3).map((finding) => finding.id.replaceAll("_", " ")).join(", ");
  const baseReason = top ? `The strongest opportunities are ${top}. ${offer.name} is the best fit for that combination.` : `${offer.name} provides a practical starting point while Moonrock gathers more operating data.`;
  const recommendationReason = budgetNote ? `${baseReason} ${budgetNote}` : baseReason;
  const opportunityEstimate = estimateOpportunity(input);
  return { path: input.path, bottlenecks, recommendedOfferId, recommendationReason, autonomousCloseAllowed, escalationReasons, ...(opportunityEstimate ? { opportunityEstimate } : {}) };
}

// ---------------------------------------------------------------------------
// Tier classification. Fully additive: diagnoseBusiness/scoreFindings/
// chooseOffer above are untouched. classifyAndDiagnose is a new entry point
// above diagnoseBusiness, not a replacement for it — existing callers of
// diagnoseBusiness keep calling it directly for the ai_employee tier.
// ---------------------------------------------------------------------------

export interface ServiceTierClassification {
  tier: ServiceTier;
  confidence: "explicit" | "inferred";
  reason: string;
}

const AGENCY_CHALLENGE_PATTERN = /my clients|resell|white.?label|agency/i;
const AGENCY_INDUSTRY_PATTERN = /agency|marketing|consult/i;
const NO_WEBSITE_CHALLENGE_PATTERN = /don'?t have a (website|site)|need a (new )?website|no website/i;
const WANTS_ONLINE_STORE_PATTERN = /online store|e-?commerce|sell\s+(?:products?|things?|items?|stuff|goods)?\s*online|shopping cart|web store|start selling online/i;
// Placeholder low-commitment signal for the ala_carte tier - an initial
// assumption to retune once real conversation data exists, per the
// ascension-funnel spec's "use my defaults" resolution. Checked last (lowest
// priority) in classifyServiceTier so it never steals a stronger signal.
const ALA_CARTE_LOW_COMMITMENT_PATTERN = /just (need|want) (a |some )?(crm|booking|reviews?|forms?|texting|email)|something (cheap|simple|small)|not ready for (an?|a full) (ai employee|website)/i;

export function classifyServiceTier(input: DiagnosticInput): ServiceTierClassification {
  const challenges = input.businessChallenges ?? "";
  const industry = input.industry ?? "";

  if (input.isAgencyOrReseller === true) {
    return { tier: "ghl_saas", confidence: "explicit", reason: "The visitor explicitly identified as an agency or reseller." };
  }
  if (AGENCY_CHALLENGE_PATTERN.test(challenges) && AGENCY_INDUSTRY_PATTERN.test(industry)) {
    return { tier: "ghl_saas", confidence: "inferred", reason: "The stated challenge and industry both point to reselling software to the visitor's own clients." };
  }

  if (input.hasExistingWebsite === false) {
    return { tier: "website_build", confidence: "explicit", reason: "The visitor confirmed they do not have a website today." };
  }
  if (NO_WEBSITE_CHALLENGE_PATTERN.test(challenges)) {
    return { tier: "website_build", confidence: "inferred", reason: "The stated challenge describes not having a website." };
  }
  if (WANTS_ONLINE_STORE_PATTERN.test(challenges)) {
    return { tier: "website_build", confidence: "inferred", reason: "The stated challenge describes wanting to sell online or set up an online store, which is a website/e-commerce build rather than an AI Employee subscription." };
  }

  if (ALA_CARTE_LOW_COMMITMENT_PATTERN.test(challenges)) {
    return { tier: "ala_carte", confidence: "inferred", reason: "The stated challenge describes a single low-commitment need rather than a full website build or AI Employee subscription." };
  }

  return { tier: "ai_employee", confidence: "inferred", reason: "No stronger signal for another tier was found; defaulting to the AI Employee bottleneck diagnosis." };
}

const WEBSITE_SCOPE_UPGRADE_PATTERN = /online store|e-?commerce|shopping cart|sell\s+(?:products?|things?|items?|stuff|goods)?\s*online|web store|booking|appointment|multiple pages|multi-page|several services|blog|portfolio/i;

function scoreWebsiteBuildFindings(input: DiagnosticInput): BottleneckFinding[] {
  const findings: BottleneckFinding[] = [];
  const text = `${input.websiteMustHaves ?? ""} ${input.businessChallenges ?? ""}`.trim();
  if (text && WEBSITE_SCOPE_UPGRADE_PATTERN.test(text)) {
    addFinding(findings, "website_scope_gap", 70, "The described must-haves point to more scope than a single landing page covers.");
  }
  return findings.sort((a, b) => b.score - a.score);
}

export interface WebsiteBuildDiagnosticResult {
  tier: "website_build";
  recommendedOfferId: WebsiteBuildId;
  recommendationReason: string;
  bottlenecks: BottleneckFinding[];
}

export function diagnoseWebsiteBuild(input: DiagnosticInput): WebsiteBuildDiagnosticResult {
  const bottlenecks = scoreWebsiteBuildFindings(input);
  const hasScopeGap = bottlenecks.some((finding) => finding.id === "website_scope_gap");
  const scope = input.websiteScopeNeeded;
  let recommendedOfferId: WebsiteBuildId = scope === "landing_page" ? "starter_site" : scope === "ecommerce" ? "custom_site" : "growth_site";
  if (hasScopeGap && recommendedOfferId === "starter_site") recommendedOfferId = "growth_site";

  let budgetNote: string | undefined;
  if (input.setupBudgetCeilingUsd !== undefined && WEBSITE_BUILD_CATALOG[recommendedOfferId].setupFeeUsd > input.setupBudgetCeilingUsd) {
    const budgetFit = chooseWebsiteBuildOfferWithinBudget(input.setupBudgetCeilingUsd);
    recommendedOfferId = budgetFit.offerId;
    budgetNote = budgetFit.fitsWithinBudget
      ? `That fits inside a stated $${input.setupBudgetCeilingUsd} budget.`
      : `Even Moonrock's most affordable Website Build option runs $${budgetFit.cheapestSetupFeeUsd}; that is the published catalog floor, not a discount.`;
  }

  const offer = WEBSITE_BUILD_CATALOG[recommendedOfferId];
  const baseReason = scope
    ? `The visitor described a ${scope.replaceAll("_", " ")} scope, which matches ${offer.name}.`
    : hasScopeGap
      ? `The described must-haves point to more than a single landing page, so ${offer.name} is the starting recommendation.`
      : `No specific scope was confirmed yet, so ${offer.name} is the starting recommendation pending the site brief.`;
  const recommendationReason = budgetNote ? `${baseReason} ${budgetNote}` : baseReason;
  return { tier: "website_build", recommendedOfferId, recommendationReason, bottlenecks };
}

const AGENCY_CLIENT_LOAD_PATTERN = /manual(ly)? report|reporting takes|spend(ing)? hours? on reports?|onboarding takes (forever|too long)|slow to onboard|hard to onboard|clients? (keep )?switch(ing)?|losing clients|client churn/i;

function scoreGhlSaasFindings(input: DiagnosticInput): BottleneckFinding[] {
  const findings: BottleneckFinding[] = [];
  const challenges = input.businessChallenges?.toLowerCase() ?? "";
  if (challenges && AGENCY_CLIENT_LOAD_PATTERN.test(challenges)) {
    addFinding(findings, "agency_client_load", 70, "The agency described manual reporting, slow onboarding, or client churn that a higher-seat white-label plan would ease.");
  }
  return findings.sort((a, b) => b.score - a.score);
}

export interface GhlSaasDiagnosticResult {
  tier: "ghl_saas";
  recommendedOfferId: GhlSaasId;
  offerName: string;
  monthlyFeeUsd: number;
  includedSeats: number;
  includedFeatures: readonly string[];
  recommendationReason: string;
  bottlenecks: BottleneckFinding[];
}

export function diagnoseGhlSaas(input: DiagnosticInput): GhlSaasDiagnosticResult {
  const bottlenecks = scoreGhlSaasFindings(input);
  const hasClientLoadSignal = bottlenecks.some((finding) => finding.id === "agency_client_load");
  const clients = input.numberOfClientsManaged ?? 0;
  let recommendedOfferId: GhlSaasId = clients > 20 ? "saas_pro" : clients > 5 ? "saas_growth" : "saas_starter";
  if (hasClientLoadSignal && recommendedOfferId === "saas_starter") recommendedOfferId = "saas_growth";

  let budgetNote: string | undefined;
  if (input.budgetCeilingMonthlyUsd !== undefined && GHL_SAAS_CATALOG[recommendedOfferId].monthlyFeeUsd > input.budgetCeilingMonthlyUsd) {
    const budgetFit = chooseGhlSaasOfferWithinBudget(input.budgetCeilingMonthlyUsd);
    recommendedOfferId = budgetFit.offerId;
    budgetNote = budgetFit.fitsWithinBudget
      ? `That fits inside a stated $${input.budgetCeilingMonthlyUsd}/month budget.`
      : `Even Moonrock's most affordable white-label plan runs $${budgetFit.cheapestMonthlyFeeUsd}/month; that is the published catalog floor, not a discount.`;
  }

  const offer = GHL_SAAS_CATALOG[recommendedOfferId];
  const baseReason = clients > 0
    ? `Managing roughly ${clients} clients points to ${offer.name}.`
    : hasClientLoadSignal
      ? `The described client-servicing load points to ${offer.name} as a starting recommendation.`
      : `No client count was confirmed yet, so ${offer.name} is the starting recommendation.`;
  const recommendationReason = budgetNote ? `${baseReason} ${budgetNote}` : baseReason;
  return {
    tier: "ghl_saas",
    recommendedOfferId,
    offerName: offer.name,
    monthlyFeeUsd: offer.monthlyFeeUsd,
    includedSeats: offer.includedSeats,
    includedFeatures: offer.includedFeatures,
    recommendationReason,
    bottlenecks,
  };
}

export type TieredDiagnosticResult =
  | (DiagnosticResult & { tier: "ai_employee" })
  | WebsiteBuildDiagnosticResult
  | GhlSaasDiagnosticResult
  | { tier: "ala_carte" };

export function classifyAndDiagnose(input: DiagnosticInput): TieredDiagnosticResult {
  const { tier } = classifyServiceTier(input);
  if (tier === "website_build") return diagnoseWebsiteBuild(input);
  if (tier === "ghl_saas") return diagnoseGhlSaas(input);
  // ala_carte's actual bundle composition lives in ascension-bundle.ts
  // (composeAlaCarteBundle), which needs alaCarteItemsRequested/
  // hasExistingCrm - not diagnostic-engine.ts's concern. classifyAndDiagnose
  // has no other callers today; this branch exists so the tier is reported
  // honestly rather than silently mislabeled as ai_employee.
  if (tier === "ala_carte") return { tier: "ala_carte" };
  return { tier: "ai_employee", ...diagnoseBusiness(input) };
}
