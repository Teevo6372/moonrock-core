import { describe, expect, it } from "vitest";
import {
  KillSwitch,
  PilotGovernanceError,
  evaluatePilotAdmission,
  evaluatePilotReadiness,
  evaluatePilotStop,
  evaluateProductionDecision,
  validatePilotPlan,
  type PilotOutcomeEvidence,
  type PilotPlan,
  type PilotReadinessEvidence,
  type PilotUsage,
} from "../src/index.js";

function plan(overrides: Partial<PilotPlan> = {}): PilotPlan {
  return {
    pilotId: "nova-r1-limited-pilot-001",
    status: "candidate",
    releaseId: "nova-web-r1-staging-candidate-001",
    owners: {
      releaseOwner: null,
      runtimeOperator: null,
      incidentOwner: null,
      privacyOwner: null,
      securityOwner: null,
      crmOwner: null,
      supportOwner: null,
      executiveDecisionOwner: null,
    },
    operatingWindow: {
      timeZone: "America/Chicago",
      days: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
      startLocal: "10:00",
      endLocal: "18:00",
      startsAt: "2026-08-01T05:00:00.000Z",
      endsAt: "2026-08-15T05:00:00.000Z",
    },
    dataBoundary: {
      anonymousGuidanceAllowed: true,
      allowedContactFields: ["first_name", "email", "phone", "company_name"],
      rawTranscriptStorage: false,
      prohibitedDataClasses: [
        "credentials",
        "payment_card",
        "government_identifier",
        "medical",
        "child_data",
        "private_client_data",
      ],
      retentionPolicyReference: null,
    },
    limits: {
      maxConcurrentSessions: 3,
      maxSessionsPerHour: 15,
      maxSessionsPerDay: 50,
      maxMessagesPerSession: 20,
      maxDailyModelTokens: 200_000,
      maxDailyCostCents: 500,
      maxDailyGhlWrites: 10,
    },
    support: {
      handoffAcknowledgementMinutes: 30,
      incidentAcknowledgementMinutes: 15,
      fallbackUrl: "https://moonrockmarketing.com/contact/",
      supportCoverageReference: null,
    },
    approvals: {
      stagingRelease: null,
      privacy: null,
      security: null,
      accessibility: null,
      crm: null,
      operations: null,
      pilotLaunch: null,
    },
    ...overrides,
  };
}

const allEvidence: PilotReadinessEvidence = {
  stagingReleaseReady: true,
  incidentExercisePassed: true,
  rollbackExercisePassed: true,
  supportExercisePassed: true,
  knowledgeApproved: true,
  modelSandboxApproved: true,
  ghlSandboxApproved: true,
  observabilityApproved: true,
  wordpressChangeApproved: true,
  wordpressRollbackVerified: true,
};

const baseUsage: PilotUsage = {
  activeSessions: 0,
  sessionsThisHour: 0,
  sessionsToday: 0,
  messagesThisSession: 0,
  modelTokensToday: 0,
  costCentsToday: 0,
  ghlWritesToday: 0,
};

function approvedPlan(): PilotPlan {
  return plan({
    status: "approved",
    owners: Object.fromEntries(
      Object.keys(plan().owners).map((owner) => [owner, `owner:${owner}`]),
    ) as unknown as PilotPlan["owners"],
    dataBoundary: {
      ...plan().dataBoundary,
      retentionPolicyReference: "policy:pilot-retention",
    },
    support: {
      ...plan().support,
      supportCoverageReference: "schedule:pilot-support",
    },
    approvals: Object.fromEntries(
      Object.keys(plan().approvals).map((approval) => [
        approval,
        `approval:${approval}`,
      ]),
    ) as unknown as PilotPlan["approvals"],
  });
}

describe("limited pilot plan", () => {
  it("accepts the bounded candidate and rejects unsafe limits or data", () => {
    expect(validatePilotPlan(plan())).toEqual(plan());
    expect(() =>
      validatePilotPlan(
        plan({
          limits: { ...plan().limits, maxConcurrentSessions: 6 },
        }),
      ),
    ).toThrow(PilotGovernanceError);
    expect(() =>
      validatePilotPlan(
        plan({
          dataBoundary: {
            ...plan().dataBoundary,
            rawTranscriptStorage: true,
          } as unknown as PilotPlan["dataBoundary"],
        }),
      ),
    ).toThrow("data boundary");
  });

  it("keeps missing owners, reviews, and evidence visible", () => {
    const decision = evaluatePilotReadiness(
      plan(),
      {
        ...allEvidence,
        stagingReleaseReady: false,
        wordpressChangeApproved: false,
      },
    );
    expect(decision.readyToLaunchPilot).toBe(false);
    expect(decision.productionApproved).toBe(false);
    expect(decision.blockers).toEqual(
      expect.arrayContaining([
        "pilot_plan_approval",
        "owner:releaseOwner",
        "owner:supportOwner",
        "retention_policy",
        "support_coverage",
        "approval:pilotLaunch",
        "evidence:stagingReleaseReady",
        "evidence:wordpressChangeApproved",
      ]),
    );
  });

  it("can authorize only the limited pilot, never production", () => {
    expect(evaluatePilotReadiness(approvedPlan(), allEvidence)).toEqual({
      readyToLaunchPilot: true,
      productionApproved: false,
      blockers: [],
      authority: "HUMAN_RELEASE_OWNER",
      productionAuthority: "HUMAN_EXECUTIVE",
    });
  });
});

describe("pilot admission guard", () => {
  it("admits a bounded request inside the Central Time support window", () => {
    expect(
      evaluatePilotAdmission({
        plan: approvedPlan(),
        now: new Date("2026-08-03T15:30:00.000Z"),
        usage: baseUsage,
        observedDataClasses: [],
        requestsGhlWrite: false,
        killSwitch: new KillSwitch(),
      }),
    ).toEqual({ admitted: true, reason: "admitted" });
  });

  it("denies outside dates or hours and when the kill switch is active", () => {
    const killSwitch = new KillSwitch();
    const common = {
      plan: approvedPlan(),
      usage: baseUsage,
      observedDataClasses: [],
      requestsGhlWrite: false,
      killSwitch,
    };
    expect(
      evaluatePilotAdmission({
        ...common,
        now: new Date("2026-09-01T15:30:00.000Z"),
      }),
    ).toMatchObject({ admitted: false, reason: "outside_pilot_dates" });
    expect(
      evaluatePilotAdmission({
        ...common,
        now: new Date("2026-08-03T13:30:00.000Z"),
      }),
    ).toMatchObject({ admitted: false, reason: "outside_operating_window" });
    killSwitch.enable();
    expect(
      evaluatePilotAdmission({
        ...common,
        now: new Date("2026-08-03T15:30:00.000Z"),
      }),
    ).toMatchObject({ admitted: false, reason: "kill_switch" });
  });

  it("denies prohibited data and every usage ceiling", () => {
    const common = {
      plan: approvedPlan(),
      now: new Date("2026-08-03T15:30:00.000Z"),
      observedDataClasses: [] as string[],
      requestsGhlWrite: false,
      killSwitch: new KillSwitch(),
    };
    expect(
      evaluatePilotAdmission({
        ...common,
        usage: baseUsage,
        observedDataClasses: ["credentials"],
      }),
    ).toMatchObject({ admitted: false, reason: "prohibited_data" });

    const cases: Array<[Partial<PilotUsage>, boolean, string]> = [
      [{ activeSessions: 3 }, false, "concurrency_limit"],
      [{ sessionsThisHour: 15 }, false, "hourly_session_limit"],
      [{ sessionsToday: 50 }, false, "daily_session_limit"],
      [{ messagesThisSession: 20 }, false, "session_message_limit"],
      [{ modelTokensToday: 200_000 }, false, "daily_token_limit"],
      [{ costCentsToday: 500 }, false, "daily_cost_limit"],
      [{ ghlWritesToday: 10 }, true, "daily_ghl_write_limit"],
    ];
    for (const [usage, requestsGhlWrite, reason] of cases) {
      expect(
        evaluatePilotAdmission({
          ...common,
          usage: { ...baseUsage, ...usage },
          requestsGhlWrite,
        }),
      ).toMatchObject({ admitted: false, reason });
    }
  });
});

describe("pilot stop and production decision", () => {
  const cleanEvidence: PilotOutcomeEvidence = {
    completedSessions: 25,
    criticalSafetyIncidents: 0,
    secretOrCrossClientDisclosures: 0,
    fabricatedProviderSuccesses: 0,
    unknownWritesReplayed: 0,
    consentComplianceRate: 1,
    handoffAcknowledgementRate: 0.95,
    successfulCompletionRate: 0.9,
    dailyBudgetBreaches: 0,
    unresolvedCleanupItems: 0,
    evidenceApproved: true,
  };

  it("stops immediately for critical safety, consent, write, data, or budget failures", () => {
    expect(
      evaluatePilotStop({
        ...cleanEvidence,
        criticalSafetyIncidents: 1,
        consentComplianceRate: 0.99,
        unknownWritesReplayed: 1,
        dailyBudgetBreaches: 1,
      }),
    ).toEqual({
      stop: true,
      reasons: [
        "critical_safety_incident",
        "unknown_write_replay",
        "consent_noncompliance",
        "budget_breach",
      ],
    });
  });

  it("requires sufficient approved evidence and a human executive decision", () => {
    expect(evaluateProductionDecision(cleanEvidence, null)).toMatchObject({
      approved: false,
      blockers: ["executive_approval"],
      authority: "HUMAN_EXECUTIVE",
    });
    expect(
      evaluateProductionDecision(cleanEvidence, "approval:executive-production"),
    ).toEqual({
      approved: true,
      blockers: [],
      authority: "HUMAN_EXECUTIVE",
    });
  });
});
