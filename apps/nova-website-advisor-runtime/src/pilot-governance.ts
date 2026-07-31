import type { KillSwitch } from "./kill-switch.js";

export interface PilotOwners {
  releaseOwner: string | null;
  runtimeOperator: string | null;
  incidentOwner: string | null;
  privacyOwner: string | null;
  securityOwner: string | null;
  crmOwner: string | null;
  supportOwner: string | null;
  executiveDecisionOwner: string | null;
}

export interface PilotPlan {
  pilotId: string;
  status: "candidate" | "approved";
  releaseId: string;
  owners: PilotOwners;
  operatingWindow: {
    timeZone: "America/Chicago";
    days: Array<"SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT">;
    startLocal: string;
    endLocal: string;
    startsAt: string;
    endsAt: string;
  };
  dataBoundary: {
    anonymousGuidanceAllowed: true;
    allowedContactFields: string[];
    rawTranscriptStorage: false;
    prohibitedDataClasses: string[];
    retentionPolicyReference: string | null;
  };
  limits: {
    maxConcurrentSessions: number;
    maxSessionsPerHour: number;
    maxSessionsPerDay: number;
    maxMessagesPerSession: number;
    maxDailyModelTokens: number;
    maxDailyCostCents: number;
    maxDailyGhlWrites: number;
  };
  support: {
    handoffAcknowledgementMinutes: number;
    incidentAcknowledgementMinutes: number;
    fallbackUrl: string;
    supportCoverageReference: string | null;
  };
  approvals: {
    stagingRelease: string | null;
    privacy: string | null;
    security: string | null;
    accessibility: string | null;
    crm: string | null;
    operations: string | null;
    pilotLaunch: string | null;
  };
}

export interface PilotReadinessEvidence {
  stagingReleaseReady: boolean;
  incidentExercisePassed: boolean;
  rollbackExercisePassed: boolean;
  supportExercisePassed: boolean;
  knowledgeApproved: boolean;
  modelSandboxApproved: boolean;
  ghlSandboxApproved: boolean;
  observabilityApproved: boolean;
  wordpressChangeApproved: boolean;
  wordpressRollbackVerified: boolean;
}

export interface PilotDecision {
  readyToLaunchPilot: boolean;
  productionApproved: false;
  blockers: string[];
  authority: "HUMAN_RELEASE_OWNER";
  productionAuthority: "HUMAN_EXECUTIVE";
}

export class PilotGovernanceError extends Error {}

const safeLimits = {
  maxConcurrentSessions: 5,
  maxSessionsPerHour: 30,
  maxSessionsPerDay: 100,
  maxMessagesPerSession: 30,
  maxDailyModelTokens: 500_000,
  maxDailyCostCents: 1_000,
  maxDailyGhlWrites: 20,
} as const;

const requiredProhibitedDataClasses = [
  "credentials",
  "payment_card",
  "government_identifier",
  "medical",
  "child_data",
  "private_client_data",
] as const;

function validLocalTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function validatePilotPlan(plan: PilotPlan): PilotPlan {
  if (
    !plan.pilotId ||
    !plan.releaseId ||
    plan.operatingWindow.timeZone !== "America/Chicago" ||
    plan.operatingWindow.days.length === 0 ||
    !validLocalTime(plan.operatingWindow.startLocal) ||
    !validLocalTime(plan.operatingWindow.endLocal) ||
    plan.operatingWindow.startLocal >= plan.operatingWindow.endLocal ||
    new Date(plan.operatingWindow.startsAt) >= new Date(plan.operatingWindow.endsAt)
  ) {
    throw new PilotGovernanceError("Pilot identity and operating window are invalid");
  }
  for (const [name, maximum] of Object.entries(safeLimits)) {
    const configured = plan.limits[name as keyof PilotPlan["limits"]];
    if (!Number.isInteger(configured) || configured < 1 || configured > maximum) {
      throw new PilotGovernanceError(`${name} exceeds the Release 1 safety cap`);
    }
  }
  if (
    plan.dataBoundary.rawTranscriptStorage !== false ||
    !requiredProhibitedDataClasses.every((item) =>
      plan.dataBoundary.prohibitedDataClasses.includes(item),
    ) ||
    plan.dataBoundary.allowedContactFields.some(
      (field) =>
        ![
          "first_name",
          "last_name",
          "email",
          "phone",
          "company_name",
          "website_domain",
          "service_area",
          "preferred_channel",
        ].includes(field),
    )
  ) {
    throw new PilotGovernanceError("Pilot data boundary is unsafe");
  }
  if (
    plan.support.handoffAcknowledgementMinutes < 1 ||
    plan.support.handoffAcknowledgementMinutes > 60 ||
    plan.support.incidentAcknowledgementMinutes < 1 ||
    plan.support.incidentAcknowledgementMinutes > 30
  ) {
    throw new PilotGovernanceError("Pilot support target exceeds the safe bound");
  }
  const fallback = new URL(plan.support.fallbackUrl);
  if (fallback.protocol !== "https:" || fallback.hostname !== "moonrockmarketing.com") {
    throw new PilotGovernanceError("Pilot fallback must use Moonrock's HTTPS site");
  }
  return structuredClone(plan);
}

export function evaluatePilotReadiness(
  plan: PilotPlan,
  evidence: PilotReadinessEvidence,
): PilotDecision {
  validatePilotPlan(plan);
  const blockers: string[] = [];
  if (plan.status !== "approved") blockers.push("pilot_plan_approval");
  for (const [owner, reference] of Object.entries(plan.owners)) {
    if (!reference) blockers.push(`owner:${owner}`);
  }
  if (!plan.dataBoundary.retentionPolicyReference) blockers.push("retention_policy");
  if (!plan.support.supportCoverageReference) blockers.push("support_coverage");
  for (const [approval, reference] of Object.entries(plan.approvals)) {
    if (!reference) blockers.push(`approval:${approval}`);
  }
  for (const [item, passed] of Object.entries(evidence)) {
    if (!passed) blockers.push(`evidence:${item}`);
  }
  return {
    readyToLaunchPilot: blockers.length === 0,
    productionApproved: false,
    blockers,
    authority: "HUMAN_RELEASE_OWNER",
    productionAuthority: "HUMAN_EXECUTIVE",
  };
}

export interface PilotUsage {
  activeSessions: number;
  sessionsThisHour: number;
  sessionsToday: number;
  messagesThisSession: number;
  modelTokensToday: number;
  costCentsToday: number;
  ghlWritesToday: number;
}

export type PilotAdmissionReason =
  | "admitted"
  | "kill_switch"
  | "outside_pilot_dates"
  | "outside_operating_window"
  | "prohibited_data"
  | "concurrency_limit"
  | "hourly_session_limit"
  | "daily_session_limit"
  | "session_message_limit"
  | "daily_token_limit"
  | "daily_cost_limit"
  | "daily_ghl_write_limit";

export function evaluatePilotAdmission(input: {
  plan: PilotPlan;
  now: Date;
  usage: PilotUsage;
  observedDataClasses: string[];
  requestsGhlWrite: boolean;
  killSwitch: KillSwitch;
}): { admitted: boolean; reason: PilotAdmissionReason } {
  validatePilotPlan(input.plan);
  if (input.killSwitch.enabled) return { admitted: false, reason: "kill_switch" };
  if (
    input.now < new Date(input.plan.operatingWindow.startsAt) ||
    input.now >= new Date(input.plan.operatingWindow.endsAt)
  ) {
    return { admitted: false, reason: "outside_pilot_dates" };
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: input.plan.operatingWindow.timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(input.now);
  const weekday = parts.find((part) => part.type === "weekday")?.value.toUpperCase();
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;
  const localTime = `${hour}:${minute}`;
  if (
    !input.plan.operatingWindow.days.includes(
      weekday as PilotPlan["operatingWindow"]["days"][number],
    ) ||
    localTime < input.plan.operatingWindow.startLocal ||
    localTime >= input.plan.operatingWindow.endLocal
  ) {
    return { admitted: false, reason: "outside_operating_window" };
  }
  if (
    input.observedDataClasses.some((item) =>
      input.plan.dataBoundary.prohibitedDataClasses.includes(item),
    )
  ) {
    return { admitted: false, reason: "prohibited_data" };
  }
  const checks: Array<[boolean, PilotAdmissionReason]> = [
    [
      input.usage.activeSessions >= input.plan.limits.maxConcurrentSessions,
      "concurrency_limit",
    ],
    [
      input.usage.sessionsThisHour >= input.plan.limits.maxSessionsPerHour,
      "hourly_session_limit",
    ],
    [
      input.usage.sessionsToday >= input.plan.limits.maxSessionsPerDay,
      "daily_session_limit",
    ],
    [
      input.usage.messagesThisSession >= input.plan.limits.maxMessagesPerSession,
      "session_message_limit",
    ],
    [
      input.usage.modelTokensToday >= input.plan.limits.maxDailyModelTokens,
      "daily_token_limit",
    ],
    [
      input.usage.costCentsToday >= input.plan.limits.maxDailyCostCents,
      "daily_cost_limit",
    ],
    [
      input.requestsGhlWrite &&
        input.usage.ghlWritesToday >= input.plan.limits.maxDailyGhlWrites,
      "daily_ghl_write_limit",
    ],
  ];
  const failed = checks.find(([blocked]) => blocked);
  return failed
    ? { admitted: false, reason: failed[1] }
    : { admitted: true, reason: "admitted" };
}

export interface PilotOutcomeEvidence {
  completedSessions: number;
  criticalSafetyIncidents: number;
  secretOrCrossClientDisclosures: number;
  fabricatedProviderSuccesses: number;
  unknownWritesReplayed: number;
  consentComplianceRate: number;
  handoffAcknowledgementRate: number;
  successfulCompletionRate: number;
  dailyBudgetBreaches: number;
  unresolvedCleanupItems: number;
  evidenceApproved: boolean;
}

export function evaluatePilotStop(
  evidence: PilotOutcomeEvidence,
): { stop: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (evidence.criticalSafetyIncidents > 0) reasons.push("critical_safety_incident");
  if (evidence.secretOrCrossClientDisclosures > 0) reasons.push("data_disclosure");
  if (evidence.fabricatedProviderSuccesses > 0) reasons.push("fabricated_success");
  if (evidence.unknownWritesReplayed > 0) reasons.push("unknown_write_replay");
  if (evidence.consentComplianceRate < 1) reasons.push("consent_noncompliance");
  if (evidence.dailyBudgetBreaches > 0) reasons.push("budget_breach");
  if (evidence.unresolvedCleanupItems > 0) reasons.push("cleanup_incomplete");
  return { stop: reasons.length > 0, reasons };
}

export function evaluateProductionDecision(
  evidence: PilotOutcomeEvidence,
  executiveApprovalReference: string | null,
): {
  approved: boolean;
  blockers: string[];
  authority: "HUMAN_EXECUTIVE";
} {
  const stop = evaluatePilotStop(evidence);
  const blockers = [...stop.reasons];
  if (evidence.completedSessions < 20) blockers.push("insufficient_pilot_volume");
  if (evidence.handoffAcknowledgementRate < 0.9) blockers.push("handoff_target");
  if (evidence.successfulCompletionRate < 0.85) blockers.push("completion_target");
  if (!evidence.evidenceApproved) blockers.push("pilot_evidence_approval");
  if (!executiveApprovalReference) blockers.push("executive_approval");
  return {
    approved: blockers.length === 0,
    blockers,
    authority: "HUMAN_EXECUTIVE",
  };
}
