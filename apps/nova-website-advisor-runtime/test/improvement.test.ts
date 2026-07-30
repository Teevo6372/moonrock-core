import { describe, expect, it } from "vitest";
import {
  authorizeExperiment,
  buildQualitySnapshot,
  createEvent,
  evaluateReleaseGate,
  ImprovementGovernanceError,
  InMemoryContinuousLearningQueue,
  type ExperimentDefinition,
  type ImprovementInput,
  type ReleaseGateEvidence,
} from "../src/index.js";

const input: ImprovementInput = {
  observation: "Visitors repeatedly ask which Flight Plan route applies.",
  sourceReference: "synthetic-evaluation:conversation-017",
  affectedCapability: "website-advisor-routing",
  evidenceReferences: ["evaluation:conversation-017", "metric:route-unknown"],
  confidence: "high",
  businessImpact: "Visitors may abandon before reaching the appropriate route.",
  urgency: "priority",
  privacyConcern: false,
  proposedAction: "Test clearer route discovery language.",
  owner: "website-advisor-product-owner",
  reviewers: ["nova-governance-owner"],
  approvalClass: "operational",
  successMeasure: "Reduce unknown-route outcomes by 15% without increasing escalations.",
  triageClass: "client_experience",
  riskClass: "moderate",
};

describe("continuous learning governance", () => {
  it("keeps observations separate from controlling knowledge", () => {
    const queue = new InMemoryContinuousLearningQueue();
    const record = queue.record(input, { actor: "NOVA", actorId: "nova-runtime" });
    expect(record.status).toBe("RECORDED");
    expect(record.controllingKnowledge).toBe(false);
    expect(queue.get(record.id)).toEqual(record);
  });

  it("redacts sensitive values before recording", () => {
    const queue = new InMemoryContinuousLearningQueue();
    const record = queue.record(
      { ...input, observation: "Visitor pasted password: open-sesame" },
      { actor: "NOVA", actorId: "nova-runtime" },
    );
    expect(record.observation).toContain("[REDACTED_SECRET]");
    expect(record.redactionApplied).toBe(true);
  });

  it("requires owner, evidence, reviewer, and success measure", () => {
    const queue = new InMemoryContinuousLearningQueue();
    expect(() => queue.record(
      { ...input, reviewers: [] },
      { actor: "NOVA", actorId: "nova-runtime" },
    )).toThrow(ImprovementGovernanceError);
  });

  it("prevents Nova from reviewing or approving its own proposal", () => {
    const queue = new InMemoryContinuousLearningQueue();
    const record = queue.record(input, { actor: "NOVA", actorId: "nova-runtime" });
    const triaged = queue.transition(record.id, "TRIAGED", { actor: "OPERATOR", actorId: "ops-1" }, "Triage complete");
    queue.transition(triaged.id, "INVESTIGATED", { actor: "OPERATOR", actorId: "ops-1" }, "Evidence checked");
    queue.transition(record.id, "PROPOSED", { actor: "NOVA", actorId: "nova-runtime" }, "Draft prepared");
    expect(() => queue.transition(
      record.id,
      "REVIEWED",
      { actor: "NOVA", actorId: "nova-runtime" },
      "Self review",
    )).toThrow(/cannot authorize/);
  });

  it("preserves the full human-authorized audit path to publication", () => {
    const queue = new InMemoryContinuousLearningQueue();
    const record = queue.record(input, { actor: "NOVA", actorId: "nova-runtime" });
    const steps = [
      ["TRIAGED", "OPERATOR"],
      ["INVESTIGATED", "OPERATOR"],
      ["PROPOSED", "NOVA"],
      ["REVIEWED", "APPROVER"],
      ["APPROVED", "APPROVER"],
      ["IMPLEMENTED", "IMPLEMENTER"],
      ["VERIFIED", "APPROVER"],
      ["PUBLISHED", "PUBLISHER"],
    ] as const;
    for (const [status, actor] of steps) {
      queue.transition(record.id, status, { actor, actorId: `${actor.toLowerCase()}-1` }, `${status} evidence`);
    }
    const published = queue.get(record.id);
    expect(published?.status).toBe("PUBLISHED");
    expect(published?.history).toHaveLength(9);
  });

  it("requires protected changes to use the protected approval class", () => {
    const queue = new InMemoryContinuousLearningQueue();
    const record = queue.record(
      { ...input, riskClass: "protected", approvalClass: "operational" },
      { actor: "NOVA", actorId: "nova-runtime" },
    );
    for (const status of ["TRIAGED", "INVESTIGATED"] as const) {
      queue.transition(record.id, status, { actor: "OPERATOR", actorId: "ops-1" }, "Checked");
    }
    queue.transition(record.id, "PROPOSED", { actor: "NOVA", actorId: "nova-runtime" }, "Proposed");
    queue.transition(record.id, "REVIEWED", { actor: "APPROVER", actorId: "approver-1" }, "Reviewed");
    expect(() => queue.transition(
      record.id,
      "APPROVED",
      { actor: "APPROVER", actorId: "approver-1" },
      "Approved",
    )).toThrow(/Protected changes/);
  });
});

describe("experiment and measurement controls", () => {
  const experiment: ExperimentDefinition = {
    id: "experiment-synthetic-001",
    hypothesis: "Clearer discovery language improves route selection.",
    scope: "Synthetic evaluation fixtures only",
    owner: "website-advisor-product-owner",
    participants: ["synthetic-fixture-set"],
    dataBoundary: "No visitor or production data",
    baseline: "70% route selection",
    metric: "Correct route selection rate",
    duration: "One evaluation run",
    stopCondition: "Any safety regression",
    rollback: "Restore prior prompt fixture",
    riskClass: "high",
    approvalEvidence: null,
    status: "DRAFT",
  };

  it("blocks high-risk experiments without approval evidence", () => {
    expect(() => authorizeExperiment(experiment, "APPROVER")).toThrow(
      /approval evidence/,
    );
  });

  it("does not allow Nova to authorize an experiment", () => {
    expect(() => authorizeExperiment(
      { ...experiment, riskClass: "low" },
      "NOVA",
    )).toThrow(/Only an approver/);
  });

  it("builds aggregate quality metrics without conversation content", () => {
    const base = {
      correlationId: "correlation-synthetic-001",
      sessionId: "session-synthetic-001",
      state: "DISCOVERY_IN_PROGRESS",
      outcome: "accepted" as const,
      reasonCode: "TEST",
      knowledgeVersion: "synthetic.1",
      now: new Date("2026-07-30T00:00:00Z"),
    };
    const snapshot = buildQualitySnapshot([
      createEvent({ ...base, name: "message.accepted" }),
      createEvent({ ...base, name: "tool.denied", outcome: "denied" }),
    ], new Date("2026-07-30T01:00:00Z"));
    expect(snapshot).toMatchObject({
      eventCount: 2,
      sessionCount: 1,
      acceptedMessages: 1,
      toolDenied: 1,
    });
    expect(JSON.stringify(snapshot)).not.toContain("conversation");
  });
});

describe("release closure gate", () => {
  it("remains closed until every human-owned activation control is satisfied", () => {
    const evidence: ReleaseGateEvidence = {
      contractsValidated: true,
      safetyEvaluationsPassed: true,
      privacyReviewApproved: false,
      accessibilityReviewApproved: false,
      threatModelApproved: false,
      residualRisksOwned: true,
      operatingOwnerAssigned: true,
      incidentPathAssigned: true,
      rollbackVerified: true,
      providerCredentialsAbsentFromRepository: true,
      productionActivationApproved: false,
    };
    const decision = evaluateReleaseGate(evidence);
    expect(decision.readyForProductionActivation).toBe(false);
    expect(decision.decisionAuthority).toBe("HUMAN_EXECUTIVE");
    expect(decision.blockers).toContain("productionActivationApproved");
  });
});
