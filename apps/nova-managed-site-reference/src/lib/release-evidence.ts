import type { SiteRevision } from "./orchestration";
import type {
  ProductionReleaseResult,
  ReleaseAuthorization,
  ReleaseCandidate,
} from "./release-gate";

export interface ProductionReleaseEvidence {
  schemaVersion: "1";
  requestId: string;
  siteId: string;
  previewUrl: string;
  previousProductionRevision: SiteRevision;
  releasedRevision: SiteRevision;
  authorization: {
    source: ReleaseAuthorization["source"];
    authorizedBy: string;
    authorizedAt: string;
  };
  deployment: ProductionReleaseResult;
  recordedAt: string;
}

export function createProductionReleaseEvidence(input: {
  candidate: ReleaseCandidate;
  authorization: ReleaseAuthorization;
  previousProductionRevision: SiteRevision;
  result: ProductionReleaseResult;
  recordedAt: string;
}): ProductionReleaseEvidence {
  return {
    schemaVersion: "1",
    requestId: input.candidate.request.id,
    siteId: input.candidate.request.siteId,
    previewUrl: input.candidate.previewUrl,
    previousProductionRevision: input.previousProductionRevision,
    releasedRevision: input.candidate.revision,
    authorization: {
      source: input.authorization.source,
      authorizedBy: input.authorization.authorizedBy,
      authorizedAt: input.authorization.authorizedAt,
    },
    deployment: input.result,
    recordedAt: input.recordedAt,
  };
}

export interface RollbackAuthorization {
  requestId: string;
  siteId: string;
  releasedCommitSha: string;
  targetCommitSha: string;
  authorizedBy: string;
  authorizedAt: string;
  source: "operator";
}

export type RollbackBlockReason =
  | "authorization_missing"
  | "request_mismatch"
  | "site_mismatch"
  | "released_revision_mismatch"
  | "rollback_target_mismatch"
  | "authorization_source_not_allowed";

export type RollbackDecision =
  | {
      status: "authorized";
      evidence: ProductionReleaseEvidence;
      authorization: RollbackAuthorization;
    }
  | {
      status: "blocked";
      evidence: ProductionReleaseEvidence;
      reason: RollbackBlockReason;
    };

export function decideRollback(
  evidence: ProductionReleaseEvidence,
  authorization?: RollbackAuthorization,
): RollbackDecision {
  if (!authorization) {
    return { status: "blocked", evidence, reason: "authorization_missing" };
  }

  if (authorization.source !== "operator") {
    return { status: "blocked", evidence, reason: "authorization_source_not_allowed" };
  }

  if (authorization.requestId !== evidence.requestId) {
    return { status: "blocked", evidence, reason: "request_mismatch" };
  }

  if (authorization.siteId !== evidence.siteId) {
    return { status: "blocked", evidence, reason: "site_mismatch" };
  }

  if (authorization.releasedCommitSha !== evidence.releasedRevision.commitSha) {
    return { status: "blocked", evidence, reason: "released_revision_mismatch" };
  }

  if (authorization.targetCommitSha !== evidence.previousProductionRevision.commitSha) {
    return { status: "blocked", evidence, reason: "rollback_target_mismatch" };
  }

  return { status: "authorized", evidence, authorization };
}

export interface RollbackRevertRequest {
  repository: string;
  productionBranch: string;
  expectedCurrentCommitSha: string;
  previousProductionCommitSha: string;
  releasedCommitSha: string;
  authorizedBy: string;
  authorizedAt: string;
}

export interface RollbackRevertResult {
  revision: SiteRevision;
}

export interface RollbackRevertProvider {
  createRevert(request: RollbackRevertRequest): Promise<RollbackRevertResult>;
}

export async function executeAuthorizedRollback(
  evidence: ProductionReleaseEvidence,
  productionBranch: string,
  provider: RollbackRevertProvider,
  authorization?: RollbackAuthorization,
): Promise<RollbackRevertResult | RollbackDecision> {
  const decision = decideRollback(evidence, authorization);
  if (decision.status === "blocked") {
    return decision;
  }

  return provider.createRevert({
    repository: evidence.releasedRevision.repository,
    productionBranch,
    expectedCurrentCommitSha: evidence.releasedRevision.commitSha,
    previousProductionCommitSha: evidence.previousProductionRevision.commitSha,
    releasedCommitSha: evidence.releasedRevision.commitSha,
    authorizedBy: decision.authorization.authorizedBy,
    authorizedAt: decision.authorization.authorizedAt,
  });
}
