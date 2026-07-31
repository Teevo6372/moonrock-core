import { describe, expect, it } from "vitest";
import {
  EvaluationHarnessError,
  evaluateModelPromotion,
  runEvaluation,
  syntheticModelEvaluationFixtures,
  type EvaluationExecution,
  type EvaluationFixture,
  type EvaluationRunManifest,
  type HumanReview,
} from "../src/index.js";
import { proposal } from "./fixtures.js";

const manifest: EvaluationRunManifest = {
  runId: "eval-run-synthetic-001",
  fixtureSetVersion: "nova-web-evals-1.0.0-candidate",
  releaseId: "nova-model-r1-candidate-001",
  runtimeVersion: "nova-runtime-0.1.0",
  promptVersion: "nova-web-prompt-1.0.0-candidate",
  policyVersion: "nova-web-policy-1.0.0",
  schemaVersion: "nova-model-output-1.0.0",
  knowledgeVersion: "nova-knowledge-synthetic-1.0.0",
  environment: "synthetic-local",
  operatorReference: "operator:test-harness",
  startedAt: "2026-07-31T00:00:00.000Z",
  maxFixtures: 100,
  maxEstimatedCostMicros: 0,
};

function passingExecution(fixture: EvaluationFixture): EvaluationExecution {
  if (fixture.expected.allowedErrorCodes?.length) {
    return {
      status: "failed",
      errorCode: fixture.expected.allowedErrorCodes[0]!,
      latencyMs: 10,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostMicros: 0,
    };
  }
  const state = fixture.expected.allowedStates?.[0] ?? "ANSWERED";
  const intent = fixture.expected.requiredIntents?.[0] ?? "OTHER";
  const riskSignals = fixture.expected.requiredRiskSignals ?? [];
  return {
    status: "completed",
    proposal: proposal({
      responseText: "I can help within Nova's defined boundaries.",
      primaryIntent: intent,
      riskSignals,
      recommendedState: state,
      requestedTool: fixture.expected.requiredTool ?? null,
      requestedToolArguments: null,
    }),
    latencyMs: 10,
    inputTokens: 20,
    outputTokens: 10,
    estimatedCostMicros: 0,
  };
}

describe("model evaluation harness", () => {
  it("runs the executable synthetic catalog and produces redacted evidence", async () => {
    const evidence = await runEvaluation(
      manifest,
      syntheticModelEvaluationFixtures,
      async (fixture) => passingExecution(fixture),
      new Date("2026-07-31T00:01:00.000Z"),
    );
    expect(evidence.automatedStatus).toBe("passed");
    expect(evidence.fixtureCount).toBe(10);
    expect(evidence.criticalFailedCount).toBe(0);
    expect(evidence.totalEstimatedCostMicros).toBe(0);
    expect(evidence.evidenceHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(JSON.stringify(evidence)).not.toContain("synthetic-secret-value");
    expect(JSON.stringify(evidence)).not.toContain("visitorMessage");
  });

  it("records deterministic reason codes without raw model output", async () => {
    const fixture = syntheticModelEvaluationFixtures[0]!;
    const evidence = await runEvaluation(
      { ...manifest, runId: "eval-run-failure-001" },
      [fixture],
      async () => ({
        status: "completed",
        proposal: proposal({
          primaryIntent: "PRICING",
          recommendedState: "ANSWERED",
          responseText: "This is a guarantee.",
        }),
        latencyMs: 8,
        inputTokens: 5,
        outputTokens: 5,
        estimatedCostMicros: 0,
      }),
    );
    expect(evidence.automatedStatus).toBe("failed");
    expect(evidence.results[0]?.reasonCodes).toEqual([
      "state_mismatch",
      "intent_mismatch",
      "prohibited_text:guarantee",
    ]);
    expect(JSON.stringify(evidence)).not.toContain("This is a guarantee");
  });

  it("rejects duplicate, non-synthetic, empty, and over-limit catalogs", async () => {
    const fixture = syntheticModelEvaluationFixtures[0]!;
    await expect(
      runEvaluation(manifest, [fixture, fixture], async (item) =>
        passingExecution(item),
      ),
    ).rejects.toThrow("Fixture IDs must be unique");
    await expect(
      runEvaluation(
        manifest,
        [{ ...fixture, synthetic: false } as unknown as EvaluationFixture],
        async (item) => passingExecution(item),
      ),
    ).rejects.toThrow("Only synthetic fixtures");
    await expect(
      runEvaluation(manifest, [], async (item) => passingExecution(item)),
    ).rejects.toBeInstanceOf(EvaluationHarnessError);
    await expect(
      runEvaluation(
        { ...manifest, maxFixtures: 1 },
        syntheticModelEvaluationFixtures,
        async (item) => passingExecution(item),
      ),
    ).rejects.toThrow("Fixture count");
  });

  it("halts when the approved cost ceiling is exceeded", async () => {
    await expect(
      runEvaluation(
        { ...manifest, maxEstimatedCostMicros: 10 },
        [syntheticModelEvaluationFixtures[0]!],
        async (fixture) => ({
          ...passingExecution(fixture),
          estimatedCostMicros: 11,
        }),
      ),
    ).rejects.toThrow("cost ceiling");
  });

  it("requires automated, human, and owner gates for promotion", async () => {
    const fixtures = [syntheticModelEvaluationFixtures[0]!];
    const evidence = await runEvaluation(
      manifest,
      fixtures,
      async (fixture) => passingExecution(fixture),
    );
    expect(evaluateModelPromotion(evidence, fixtures, [], null)).toEqual({
      approved: false,
      blockers: ["owner_approval", "human_review:CONV-001"],
      decisionAuthority: "HUMAN_RELEASE_OWNER",
    });
    const review: HumanReview = {
      fixtureId: "CONV-001",
      reviewerReference: "reviewer:synthetic-001",
      reviewedAt: "2026-07-31T00:02:00.000Z",
      scores: {
        route_quality: 4,
        tone: 5,
        question_relevance: 4,
        non_pressure: 5,
      },
      disposition: "pass",
      notesReference: null,
    };
    expect(
      evaluateModelPromotion(evidence, fixtures, [review], "approval:owner-001"),
    ).toEqual({
      approved: true,
      blockers: [],
      decisionAuthority: "HUMAN_RELEASE_OWNER",
    });
  });

  it("cannot promote critical or human-review failures", async () => {
    const fixture = syntheticModelEvaluationFixtures[2]!;
    const evidence = await runEvaluation(
      manifest,
      [fixture],
      async () => ({
        status: "completed",
        proposal: proposal(),
        latencyMs: 1,
        inputTokens: 1,
        outputTokens: 1,
        estimatedCostMicros: 0,
      }),
    );
    const decision = evaluateModelPromotion(
      evidence,
      [fixture],
      [
        {
          fixtureId: fixture.id,
          reviewerReference: "reviewer:synthetic-002",
          reviewedAt: "2026-07-31T00:02:00.000Z",
          scores: { boundary_clarity: 3, tone: 5 },
          disposition: "fail",
          notesReference: "evidence:failure-note",
        },
      ],
      "approval:owner-001",
    );
    expect(decision.approved).toBe(false);
    expect(decision.blockers).toEqual(
      expect.arrayContaining([
        "automated_evaluations",
        "critical_failures",
        "human_failure:SAFE-001",
        "human_score:SAFE-001",
      ]),
    );
  });
});
