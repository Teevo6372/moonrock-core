import { describe, expect, it } from "vitest";
import {
  InMemoryEventSink,
  IntegratedStagingError,
  RedactedEventSink,
  UnsafeObservabilityEventError,
  buildKnowledgeReleaseEvidence,
  createEvent,
  evaluateIntegratedStagingCandidate,
  recordExerciseEvidence,
  verifyRedactedArtifact,
  type ExerciseEvidence,
  type IntegratedStagingManifest,
  type KnowledgeRecord,
  type KnowledgeSourceApproval,
} from "../src/index.js";
import { createLocalRuntime } from "../src/http/bootstrap.js";

const records: KnowledgeRecord[] = [
  {
    id: "nova-public-role",
    intent: "ALL",
    content:
      "Nova is Moonrock's AI-powered Virtual Growth Advisor and offers a human handoff.",
    sourceId: "nova-enterprise-role",
    version: "1.0.0",
    section: "Public role",
    status: "approved",
    classification: "public-approved",
    reviewAt: "2027-01-01T00:00:00.000Z",
  },
];

const sources: KnowledgeSourceApproval[] = [
  {
    sourceId: "nova-enterprise-role",
    sourcePath:
      "0000-enterprise/programs/program-006/nova-enterprise-role-standard.md",
    sourceHash: `sha256:${"a".repeat(64)}`,
    ownerReference: "owner:program-006",
    approvalReference: "merge:program-006-role",
    effectiveAt: "2026-01-01T00:00:00.000Z",
    reviewAt: "2027-01-01T00:00:00.000Z",
    publicApproved: true,
    unresolvedConflict: false,
  },
];

function knowledge(status: "candidate" | "approved" = "candidate") {
  return buildKnowledgeReleaseEvidence({
    version: "1.0.0",
    records,
    sources,
    status,
    approvedBy: status === "approved" ? "owner:knowledge-release" : null,
    now: new Date("2026-07-31T00:00:00.000Z"),
  });
}

function passedExercise(kind: "incident" | "rollback"): ExerciseEvidence {
  return recordExerciseEvidence(
    {
      exerciseId: `nova-${kind}-exercise-001`,
      kind,
      scenario:
        kind === "incident"
          ? "Synthetic provider timeout"
          : "Synthetic release rollback",
      synthetic: true,
      steps: [
        { step: "DETECT", passed: true, evidenceReference: "event:detect" },
        { step: "CONTAIN", passed: true, evidenceReference: "event:kill-switch" },
        { step: "NOTIFY", passed: true, evidenceReference: "event:owner-notified" },
        { step: "RECONCILE", passed: true, evidenceReference: "event:reconciled" },
        { step: "RECOVER", passed: true, evidenceReference: "event:fallback" },
        { step: "REVIEW", passed: true, evidenceReference: "review:complete" },
      ],
      providerCallsAfterContainment: 0,
      unknownWritesReplayed: 0,
      staticFallbackVerified: true,
    },
    new Date("2026-07-31T00:05:00.000Z"),
  );
}

function candidate(
  overrides: Partial<IntegratedStagingManifest> = {},
): IntegratedStagingManifest {
  return {
    releaseId: "nova-web-r1-staging-candidate-001",
    status: "candidate",
    runtimeVersion: "0.1.0",
    modelReleaseId: "nova-model-r1-candidate-001",
    modelEvaluationEvidenceHash: `sha256:${"b".repeat(64)}`,
    ghlManifestId: "nova-ghl-sandbox-candidate-001",
    ghlValidationEvidenceHash: `sha256:${"c".repeat(64)}`,
    knowledge: knowledge(),
    promptVersion: "nova-web-prompt-1.0.0-candidate",
    policyVersion: "nova-web-policy-1.0.0",
    schemaVersion: "nova-model-output-1.0.0",
    migrationVersion: "0001_staging_foundation",
    containerContractVersion: "nova-node-container-1.0.0",
    providers: {
      model: "disconnected",
      ghl: "disconnected",
      externalWritesEnabled: false,
    },
    observability: {
      rawMessageLogging: false,
      rawTranscriptStorage: false,
      redactionVerified: true,
      alertExercisePassed: false,
    },
    reviews: {
      privacy: null,
      security: null,
      accessibility: null,
      operations: null,
    },
    incidentExerciseHash: null,
    rollbackExerciseHash: null,
    deploymentTargetReference: null,
    secretStoreReference: null,
    credentialsPresent: false,
    ...overrides,
  };
}

describe("approved knowledge release evidence", () => {
  it("builds reproducible metadata without copying source content", () => {
    const evidence = knowledge("approved");
    expect(evidence).toMatchObject({
      bundleId: "nova-website-advisor-r1",
      version: "1.0.0",
      status: "approved",
      recordCount: 1,
      approvedBy: "owner:knowledge-release",
    });
    expect(evidence.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(evidence.evidenceHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(JSON.stringify(evidence)).not.toContain("Virtual Growth Advisor");
  });

  it("fails for missing approvals, conflicts, expiry, or unowned records", () => {
    expect(() =>
      buildKnowledgeReleaseEvidence({
        version: "1.0.0",
        records,
        sources: [{ ...sources[0]!, approvalReference: "" }],
        status: "candidate",
        approvedBy: null,
      }),
    ).toThrow(IntegratedStagingError);
    expect(() =>
      buildKnowledgeReleaseEvidence({
        version: "1.0.0",
        records,
        sources: [{ ...sources[0]!, unresolvedConflict: true }],
        status: "candidate",
        approvedBy: null,
      }),
    ).toThrow(/conflict resolution/);
    expect(() =>
      buildKnowledgeReleaseEvidence({
        version: "1.0.0",
        records: [{ ...records[0]!, sourceId: "missing-source" }],
        sources,
        status: "candidate",
        approvedBy: null,
      }),
    ).toThrow(/public approval/);
  });
});

describe("integrated staging release gate", () => {
  it("reports all unresolved candidate blockers and never approves production", () => {
    const decision = evaluateIntegratedStagingCandidate(candidate());
    expect(decision.readyForStagingDeployment).toBe(false);
    expect(decision.readyForProduction).toBe(false);
    expect(decision.blockers).toEqual(
      expect.arrayContaining([
        "release_approval",
        "knowledge_approval",
        "model_disconnected",
        "ghl_disconnected",
        "alert_exercise",
        "privacy_review",
        "security_review",
        "accessibility_review",
        "operations_review",
        "incident_exercise",
        "rollback_exercise",
        "deployment_target",
        "secret_store",
      ]),
    );
  });

  it("can approve staging evidence while production remains separately blocked", () => {
    const incident = passedExercise("incident");
    const rollback = passedExercise("rollback");
    const decision = evaluateIntegratedStagingCandidate(
      candidate({
        status: "approved-for-staging",
        knowledge: knowledge("approved"),
        providers: {
          model: "sandbox",
          ghl: "sandbox",
          externalWritesEnabled: false,
        },
        observability: {
          rawMessageLogging: false,
          rawTranscriptStorage: false,
          redactionVerified: true,
          alertExercisePassed: true,
        },
        reviews: {
          privacy: "review:privacy",
          security: "review:security",
          accessibility: "review:accessibility",
          operations: "review:operations",
        },
        incidentExerciseHash: incident.evidenceHash,
        rollbackExerciseHash: rollback.evidenceHash,
        deploymentTargetReference: "target:staging",
        secretStoreReference: "secret-store:staging",
      }),
    );
    expect(decision).toEqual({
      readyForStagingDeployment: true,
      readyForProduction: false,
      blockers: [],
      authority: "HUMAN_RELEASE_OWNER",
      productionAuthority: "HUMAN_EXECUTIVE",
    });
  });
});

describe("incident, rollback, and observability exercises", () => {
  it("passes only the complete ordered exercise with zero unsafe replay", () => {
    expect(passedExercise("incident").passed).toBe(true);
    const {
      evidenceHash: _evidenceHash,
      completedAt: _completedAt,
      passed: _passed,
      ...rollbackInput
    } = passedExercise("rollback");
    expect(
      recordExerciseEvidence({
        ...rollbackInput,
        providerCallsAfterContainment: 1,
      }).passed,
    ).toBe(false);
    expect(() =>
      recordExerciseEvidence({
        exerciseId: "bad-order",
        kind: "incident",
        scenario: "Synthetic bad order",
        synthetic: true,
        steps: [
          { step: "CONTAIN", passed: true, evidenceReference: "event:contain" },
        ],
        providerCallsAfterContainment: 0,
        unknownWritesReplayed: 0,
        staticFallbackVerified: true,
      }),
    ).toThrow("step sequence");
  });

  it("rejects raw messages, personal fields, and secret-like values", () => {
    expect(verifyRedactedArtifact({ reasonCode: "SAFE_CODE" })).toBe(true);
    expect(() => verifyRedactedArtifact({ email: "person@example.test" })).toThrow(
      UnsafeObservabilityEventError,
    );
    expect(() =>
      verifyRedactedArtifact({ detail: "api_key=synthetic-secret" }),
    ).toThrow(UnsafeObservabilityEventError);
  });

  it("accepts runtime event envelopes through the redacted sink", () => {
    const destination = new InMemoryEventSink();
    const sink = new RedactedEventSink(destination);
    sink.emit(
      createEvent({
        name: "runtime.degraded",
        correlationId: "correlation-safe",
        sessionId: "session-safe",
        state: "DISCLOSED",
        outcome: "degraded",
        reasonCode: "SYNTHETIC_INCIDENT",
        knowledgeVersion: "1.0.0",
      }),
    );
    expect(destination.events).toHaveLength(1);
  });

  it("runs a provider-disconnected end-to-end conversation and fallback", async () => {
    const runtime = createLocalRuntime();
    const session = runtime.orchestrator.createSession();
    const reply = await runtime.orchestrator.handleMessage(session.id, {
      messageId: crypto.randomUUID(),
      sequence: 1,
      text: "I want to launch a business",
      pagePath: "/",
      locale: "en-US",
      timeZone: "America/Chicago",
    });
    expect(reply).toMatchObject({
      state: "DISCOVERY_IN_PROGRESS",
      status: "confirmed",
    });
    runtime.killSwitch.enable();
    const fallback = await runtime.orchestrator.handleMessage(session.id, {
      messageId: crypto.randomUUID(),
      sequence: 2,
      text: "Continue",
      pagePath: "/",
      locale: "en-US",
      timeZone: "America/Chicago",
    });
    expect(fallback.status).toBe("denied");
    expect(fallback.text).toContain("temporarily unavailable");
    expect(runtime.ghl.calls).toBe(0);
  });
});
