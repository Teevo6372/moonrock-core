import { createHash } from "node:crypto";
import {
  calculateKnowledgeHash,
  type KnowledgeRecord,
} from "./knowledge.js";

export interface KnowledgeSourceApproval {
  sourceId: string;
  sourcePath: string;
  sourceHash: `sha256:${string}`;
  ownerReference: string;
  approvalReference: string;
  effectiveAt: string;
  reviewAt: string;
  publicApproved: boolean;
  unresolvedConflict: boolean;
}

export interface KnowledgeReleaseEvidence {
  bundleId: "nova-website-advisor-r1";
  version: string;
  status: "candidate" | "approved";
  contentHash: `sha256:${string}`;
  recordCount: number;
  sourceIds: string[];
  builtAt: string;
  approvedBy: string | null;
  evidenceHash: `sha256:${string}`;
}

export class IntegratedStagingError extends Error {}

export function buildKnowledgeReleaseEvidence(input: {
  version: string;
  records: KnowledgeRecord[];
  sources: KnowledgeSourceApproval[];
  status: "candidate" | "approved";
  approvedBy: string | null;
  now?: Date;
}): KnowledgeReleaseEvidence {
  const now = input.now ?? new Date();
  if (!/^\d+\.\d+\.\d+$/.test(input.version) || input.records.length === 0) {
    throw new IntegratedStagingError("Knowledge release is incomplete");
  }
  const sourceIds = new Set(input.sources.map((source) => source.sourceId));
  if (
    input.sources.length === 0 ||
    input.records.some((record) => !sourceIds.has(record.sourceId)) ||
    input.sources.some(
      (source) =>
        !source.ownerReference ||
        !source.approvalReference ||
        !source.sourceHash.startsWith("sha256:") ||
        !source.publicApproved ||
        source.unresolvedConflict ||
        new Date(source.reviewAt) <= now ||
        new Date(source.effectiveAt) > now,
    )
  ) {
    throw new IntegratedStagingError(
      "Knowledge sources require current public approval and conflict resolution",
    );
  }
  if (input.records.some((record) => new Date(record.reviewAt) <= now)) {
    throw new IntegratedStagingError("Knowledge record is expired");
  }
  if (input.status === "approved" && !input.approvedBy) {
    throw new IntegratedStagingError(
      "Approved knowledge requires an approver reference",
    );
  }
  const evidenceWithoutHash = {
    bundleId: "nova-website-advisor-r1" as const,
    version: input.version,
    status: input.status,
    contentHash: calculateKnowledgeHash(input.records) as `sha256:${string}`,
    recordCount: input.records.length,
    sourceIds: [...sourceIds].sort(),
    builtAt: now.toISOString(),
    approvedBy: input.approvedBy,
  };
  return {
    ...evidenceWithoutHash,
    evidenceHash: `sha256:${createHash("sha256")
      .update(JSON.stringify(evidenceWithoutHash))
      .digest("hex")}`,
  };
}

export interface IntegratedStagingManifest {
  releaseId: string;
  status: "candidate" | "approved-for-staging";
  runtimeVersion: string;
  modelReleaseId: string;
  modelEvaluationEvidenceHash: `sha256:${string}`;
  ghlManifestId: string;
  ghlValidationEvidenceHash: `sha256:${string}`;
  knowledge: KnowledgeReleaseEvidence;
  promptVersion: string;
  policyVersion: string;
  schemaVersion: string;
  migrationVersion: string;
  containerContractVersion: string;
  providers: {
    model: "disconnected" | "sandbox";
    ghl: "disconnected" | "sandbox";
    externalWritesEnabled: false;
  };
  observability: {
    rawMessageLogging: false;
    rawTranscriptStorage: false;
    redactionVerified: boolean;
    alertExercisePassed: boolean;
  };
  reviews: {
    privacy: string | null;
    security: string | null;
    accessibility: string | null;
    operations: string | null;
  };
  incidentExerciseHash: `sha256:${string}` | null;
  rollbackExerciseHash: `sha256:${string}` | null;
  deploymentTargetReference: string | null;
  secretStoreReference: string | null;
  credentialsPresent: false;
}

export interface IntegratedStagingDecision {
  readyForStagingDeployment: boolean;
  readyForProduction: false;
  blockers: string[];
  authority: "HUMAN_RELEASE_OWNER";
  productionAuthority: "HUMAN_EXECUTIVE";
}

export function evaluateIntegratedStagingCandidate(
  manifest: IntegratedStagingManifest,
): IntegratedStagingDecision {
  const blockers: string[] = [];
  if (manifest.status !== "approved-for-staging") blockers.push("release_approval");
  if (manifest.knowledge.status !== "approved") blockers.push("knowledge_approval");
  if (manifest.providers.model !== "sandbox") blockers.push("model_disconnected");
  if (manifest.providers.ghl !== "sandbox") blockers.push("ghl_disconnected");
  if (!manifest.observability.redactionVerified) blockers.push("redaction_verification");
  if (!manifest.observability.alertExercisePassed) blockers.push("alert_exercise");
  for (const [review, reference] of Object.entries(manifest.reviews)) {
    if (!reference) blockers.push(`${review}_review`);
  }
  if (!manifest.incidentExerciseHash) blockers.push("incident_exercise");
  if (!manifest.rollbackExerciseHash) blockers.push("rollback_exercise");
  if (!manifest.deploymentTargetReference) blockers.push("deployment_target");
  if (!manifest.secretStoreReference) blockers.push("secret_store");
  if (manifest.providers.externalWritesEnabled !== false || manifest.credentialsPresent) {
    blockers.push("unsafe_external_posture");
  }
  return {
    readyForStagingDeployment: blockers.length === 0,
    readyForProduction: false,
    blockers,
    authority: "HUMAN_RELEASE_OWNER",
    productionAuthority: "HUMAN_EXECUTIVE",
  };
}

export type ExerciseStep =
  | "DETECT"
  | "CONTAIN"
  | "NOTIFY"
  | "RECONCILE"
  | "RECOVER"
  | "REVIEW";

export interface ExerciseEvidence {
  exerciseId: string;
  kind: "incident" | "rollback";
  scenario: string;
  synthetic: true;
  steps: Array<{
    step: ExerciseStep;
    passed: boolean;
    evidenceReference: string;
  }>;
  providerCallsAfterContainment: number;
  unknownWritesReplayed: number;
  staticFallbackVerified: boolean;
  passed: boolean;
  completedAt: string;
  evidenceHash: `sha256:${string}`;
}

const requiredExerciseSteps: ExerciseStep[] = [
  "DETECT",
  "CONTAIN",
  "NOTIFY",
  "RECONCILE",
  "RECOVER",
  "REVIEW",
];

export function recordExerciseEvidence(
  input: Omit<ExerciseEvidence, "passed" | "completedAt" | "evidenceHash">,
  now = new Date(),
): ExerciseEvidence {
  if (!input.exerciseId || !input.scenario || input.synthetic !== true) {
    throw new IntegratedStagingError("Exercise must be identified and synthetic");
  }
  const ordered = input.steps.map((step) => step.step);
  if (
    ordered.length !== requiredExerciseSteps.length ||
    ordered.some((step, index) => step !== requiredExerciseSteps[index]) ||
    input.steps.some((step) => !step.evidenceReference)
  ) {
    throw new IntegratedStagingError("Exercise step sequence is incomplete");
  }
  const passed =
    input.steps.every((step) => step.passed) &&
    input.providerCallsAfterContainment === 0 &&
    input.unknownWritesReplayed === 0 &&
    input.staticFallbackVerified;
  const evidenceWithoutHash = {
    ...structuredClone(input),
    passed,
    completedAt: now.toISOString(),
  };
  return {
    ...evidenceWithoutHash,
    evidenceHash: `sha256:${createHash("sha256")
      .update(JSON.stringify(evidenceWithoutHash))
      .digest("hex")}`,
  };
}
