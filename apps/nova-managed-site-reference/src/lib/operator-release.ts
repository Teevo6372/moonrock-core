import { readFile } from "node:fs/promises";
import { CloudflarePagesProductionReleaseProvider } from "./production-deployment";
import {
  CloudflareApiProductionDeploymentWatcher,
  GitHubApiProductionBranchPromoter,
  type FetchLike,
  type Sleep,
} from "./live-production-integrations";
import { GitBackedCloudflareProductionTransport } from "./production-transport";
import {
  publishAuthorizedRelease,
  type ProductionReleaseResult,
  type ReleaseAuthorization,
  type ReleaseCandidate,
  type ReleaseDecision,
} from "./release-gate";

export interface OperatorReleaseEnvelope {
  candidate: ReleaseCandidate;
  authorization: ReleaseAuthorization;
}

export interface OperatorReleaseEnvironment {
  githubToken: string;
  cloudflareAccountId: string;
  cloudflareApiToken: string;
  cloudflareProjectName: string;
  productionBranch: string;
  expectedProductionCommitSha: string;
}

export interface OperatorReleaseRuntime {
  githubFetch?: FetchLike;
  cloudflareFetch?: FetchLike;
  sleep?: Sleep;
}

export type OperatorEnvironmentSource = Readonly<Record<string, string | undefined>>;

function requireEnvironmentValue(environment: OperatorEnvironmentSource, name: string): string {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(`operator_release_env_missing:${name}`);
  }
  return value;
}

export function readOperatorReleaseEnvironment(
  environment: OperatorEnvironmentSource,
): OperatorReleaseEnvironment {
  return {
    githubToken: requireEnvironmentValue(environment, "MOONROCK_GITHUB_TOKEN"),
    cloudflareAccountId: requireEnvironmentValue(environment, "MOONROCK_CLOUDFLARE_ACCOUNT_ID"),
    cloudflareApiToken: requireEnvironmentValue(environment, "MOONROCK_CLOUDFLARE_API_TOKEN"),
    cloudflareProjectName: requireEnvironmentValue(environment, "MOONROCK_CLOUDFLARE_PROJECT"),
    productionBranch: requireEnvironmentValue(environment, "MOONROCK_PRODUCTION_BRANCH"),
    expectedProductionCommitSha: requireEnvironmentValue(
      environment,
      "MOONROCK_EXPECTED_PRODUCTION_SHA",
    ),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseOperatorReleaseEnvelope(value: unknown): OperatorReleaseEnvelope {
  if (!isRecord(value) || !isRecord(value.candidate) || !isRecord(value.authorization)) {
    throw new Error("operator_release_envelope_invalid");
  }

  const candidate = value.candidate as unknown as ReleaseCandidate;
  const authorization = value.authorization as unknown as ReleaseAuthorization;

  if (
    !candidate.request?.id ||
    !candidate.request?.siteId ||
    !candidate.previewUrl ||
    !candidate.revision?.repository ||
    !candidate.revision?.branch ||
    !candidate.revision?.commitSha ||
    !authorization.requestId ||
    !authorization.siteId ||
    !authorization.previewUrl ||
    !authorization.revision?.repository ||
    !authorization.revision?.branch ||
    !authorization.revision?.commitSha ||
    !authorization.source ||
    !authorization.authorizedBy ||
    !authorization.authorizedAt
  ) {
    throw new Error("operator_release_envelope_invalid");
  }

  return { candidate, authorization };
}

export async function readOperatorReleaseEnvelope(path: string): Promise<OperatorReleaseEnvelope> {
  const raw = await readFile(path, "utf8");
  return parseOperatorReleaseEnvelope(JSON.parse(raw) as unknown);
}

export async function runOperatorProductionRelease(
  envelope: OperatorReleaseEnvelope,
  environment: OperatorReleaseEnvironment,
  runtime: OperatorReleaseRuntime = {},
): Promise<ProductionReleaseResult | ReleaseDecision> {
  const promoter = new GitHubApiProductionBranchPromoter(
    { token: environment.githubToken },
    runtime.githubFetch,
  );

  const watcher = new CloudflareApiProductionDeploymentWatcher(
    {
      accountId: environment.cloudflareAccountId,
      apiToken: environment.cloudflareApiToken,
      projectBySiteId: {
        [envelope.candidate.request.siteId]: environment.cloudflareProjectName,
      },
    },
    runtime.cloudflareFetch,
    runtime.sleep,
  );

  const transport = new GitBackedCloudflareProductionTransport(
    {
      productionBranch: environment.productionBranch,
      expectedProductionCommitSha: environment.expectedProductionCommitSha,
    },
    promoter,
    watcher,
  );

  const provider = new CloudflarePagesProductionReleaseProvider(transport);

  return publishAuthorizedRelease(envelope.candidate, provider, envelope.authorization);
}
