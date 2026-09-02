import {
  executeAuthorizedRollback,
  type ProductionReleaseEvidence,
  type RollbackAuthorization,
  type RollbackDecision,
  type RollbackRevertResult,
} from "./release-evidence";
import { GitHubApiRollbackRevertProvider } from "./live-release-safety";
import type { FetchLike } from "./live-production-integrations";

export interface OperatorRollbackEnvelope {
  evidence: ProductionReleaseEvidence;
  authorization: RollbackAuthorization;
}

export interface OperatorRollbackEnvironment {
  githubToken: string;
  productionBranch: string;
}

export interface OperatorRollbackRuntime {
  githubFetch?: FetchLike;
}

export type OperatorEnvironmentSource = Readonly<Record<string, string | undefined>>;

function requireEnvironmentValue(environment: OperatorEnvironmentSource, name: string): string {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(`operator_rollback_env_missing:${name}`);
  }
  return value;
}

export function readOperatorRollbackEnvironment(
  environment: OperatorEnvironmentSource,
): OperatorRollbackEnvironment {
  return {
    githubToken: requireEnvironmentValue(environment, "MOONROCK_GITHUB_TOKEN"),
    productionBranch: requireEnvironmentValue(environment, "MOONROCK_PRODUCTION_BRANCH"),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseOperatorRollbackEnvelope(value: unknown): OperatorRollbackEnvelope {
  if (!isRecord(value) || !isRecord(value.evidence) || !isRecord(value.authorization)) {
    throw new Error("operator_rollback_envelope_invalid");
  }

  const evidence = value.evidence as unknown as ProductionReleaseEvidence;
  const authorization = value.authorization as unknown as RollbackAuthorization;

  if (
    evidence.schemaVersion !== "1" ||
    !evidence.requestId ||
    !evidence.siteId ||
    !evidence.previousProductionRevision?.commitSha ||
    !evidence.releasedRevision?.commitSha ||
    !authorization.requestId ||
    !authorization.siteId ||
    !authorization.releasedCommitSha ||
    !authorization.targetCommitSha ||
    !authorization.authorizedBy ||
    !authorization.authorizedAt ||
    authorization.source !== "operator"
  ) {
    throw new Error("operator_rollback_envelope_invalid");
  }

  return { evidence, authorization };
}

export async function runOperatorRollback(
  envelope: OperatorRollbackEnvelope,
  environment: OperatorRollbackEnvironment,
  runtime: OperatorRollbackRuntime = {},
): Promise<RollbackRevertResult | RollbackDecision> {
  const provider = new GitHubApiRollbackRevertProvider(
    { token: environment.githubToken },
    runtime.githubFetch,
  );

  return executeAuthorizedRollback(
    envelope.evidence,
    environment.productionBranch,
    provider,
    envelope.authorization,
  );
}
