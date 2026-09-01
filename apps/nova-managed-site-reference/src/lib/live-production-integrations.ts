import type { SiteRevision } from "./orchestration";
import type {
  CloudflareProductionDeployment,
  CloudflareProductionDeploymentWatcher,
  ProductionBranchPromoter,
  ProductionBranchPromotion,
} from "./production-transport";

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

function requireOk(response: Response, errorCode: string): void {
  if (!response.ok) {
    throw new Error(`${errorCode}:${response.status}`);
  }
}

function parseRepository(repository: string): { owner: string; repo: string } {
  const [owner, repo, ...rest] = repository.split("/");
  if (!owner || !repo || rest.length > 0) {
    throw new Error("github_repository_invalid");
  }

  return { owner, repo };
}

function encodeBranch(branch: string): string {
  if (!branch || branch.startsWith("/") || branch.endsWith("/")) {
    throw new Error("github_branch_invalid");
  }

  return branch
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

interface GitHubRefResponse {
  object?: {
    sha?: string;
  };
}

export interface GitHubApiProductionBranchPromoterConfig {
  token: string;
  apiBaseUrl?: string;
  apiVersion?: string;
}

/**
 * Live-capable GitHub implementation of the production promotion boundary.
 * It verifies the expected production HEAD before issuing a force:false ref update,
 * then verifies GitHub reports the reviewed commit as the new branch HEAD.
 */
export class GitHubApiProductionBranchPromoter implements ProductionBranchPromoter {
  private readonly apiBaseUrl: string;
  private readonly apiVersion: string;

  constructor(
    private readonly config: GitHubApiProductionBranchPromoterConfig,
    private readonly fetchFn: FetchLike = fetch,
  ) {
    if (!config.token) {
      throw new Error("github_token_missing");
    }

    this.apiBaseUrl = (config.apiBaseUrl ?? "https://api.github.com").replace(/\/$/, "");
    this.apiVersion = config.apiVersion ?? "2026-03-10";
  }

  async promoteFastForward(
    promotion: ProductionBranchPromotion,
  ): Promise<{ productionRevision: SiteRevision }> {
    const { owner, repo } = parseRepository(promotion.repository);
    const encodedBranch = encodeBranch(promotion.productionBranch);
    const refUrl = `${this.apiBaseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${encodedBranch}`;
    const updateUrl = `${this.apiBaseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs/heads/${encodedBranch}`;
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${this.config.token}`,
      "X-GitHub-Api-Version": this.apiVersion,
    };

    const currentResponse = await this.fetchFn(refUrl, { headers });
    requireOk(currentResponse, "github_ref_read_failed");
    const current = (await currentResponse.json()) as GitHubRefResponse;

    if (current.object?.sha !== promotion.expectedCurrentCommitSha) {
      throw new Error("production_head_changed");
    }

    const updateResponse = await this.fetchFn(updateUrl, {
      method: "PATCH",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sha: promotion.targetCommitSha,
        force: false,
      }),
    });
    requireOk(updateResponse, "github_ref_update_failed");
    const updated = (await updateResponse.json()) as GitHubRefResponse;

    if (updated.object?.sha !== promotion.targetCommitSha) {
      throw new Error("github_ref_update_mismatch");
    }

    return {
      productionRevision: {
        repository: promotion.repository,
        branch: promotion.productionBranch,
        commitSha: promotion.targetCommitSha,
      },
    };
  }
}

interface CloudflareDeploymentRecord {
  id?: string;
  url?: string;
  environment?: "preview" | "production";
  is_skipped?: boolean;
  latest_stage?: {
    status?: "success" | "idle" | "active" | "failure" | "canceled";
  };
  deployment_trigger?: {
    metadata?: {
      branch?: string;
      commit_hash?: string;
    };
  };
}

interface CloudflareDeploymentListResponse {
  success?: boolean;
  result?: CloudflareDeploymentRecord[];
}

export interface CloudflareApiProductionDeploymentWatcherConfig {
  accountId: string;
  apiToken: string;
  projectBySiteId: Record<string, string>;
  apiBaseUrl?: string;
  pollIntervalMs?: number;
  maxAttempts?: number;
}

export type Sleep = (milliseconds: number) => Promise<void>;

const defaultSleep: Sleep = async (milliseconds) => {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
};

/**
 * Live-capable Cloudflare Pages watcher. It polls only production deployments and
 * returns only after Cloudflare reports a successful, non-skipped deployment for the
 * exact approved branch and commit SHA.
 */
export class CloudflareApiProductionDeploymentWatcher
  implements CloudflareProductionDeploymentWatcher
{
  private readonly apiBaseUrl: string;
  private readonly pollIntervalMs: number;
  private readonly maxAttempts: number;

  constructor(
    private readonly config: CloudflareApiProductionDeploymentWatcherConfig,
    private readonly fetchFn: FetchLike = fetch,
    private readonly sleep: Sleep = defaultSleep,
  ) {
    if (!config.accountId) {
      throw new Error("cloudflare_account_missing");
    }
    if (!config.apiToken) {
      throw new Error("cloudflare_token_missing");
    }

    this.apiBaseUrl = (config.apiBaseUrl ?? "https://api.cloudflare.com/client/v4").replace(
      /\/$/,
      "",
    );
    this.pollIntervalMs = config.pollIntervalMs ?? 2_000;
    this.maxAttempts = config.maxAttempts ?? 30;

    if (this.maxAttempts < 1) {
      throw new Error("cloudflare_poll_attempts_invalid");
    }
  }

  async waitForProductionDeployment(input: {
    siteId: string;
    productionBranch: string;
    commitSha: string;
  }): Promise<CloudflareProductionDeployment> {
    const projectName = this.config.projectBySiteId[input.siteId];
    if (!projectName) {
      throw new Error("cloudflare_project_not_configured");
    }

    const deploymentsUrl = new URL(
      `${this.apiBaseUrl}/accounts/${encodeURIComponent(this.config.accountId)}/pages/projects/${encodeURIComponent(projectName)}/deployments`,
    );
    deploymentsUrl.searchParams.set("env", "production");
    deploymentsUrl.searchParams.set("per_page", "25");

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const response = await this.fetchFn(deploymentsUrl, {
        headers: {
          Authorization: `Bearer ${this.config.apiToken}`,
        },
      });
      requireOk(response, "cloudflare_deployments_read_failed");
      const payload = (await response.json()) as CloudflareDeploymentListResponse;

      if (payload.success !== true || !Array.isArray(payload.result)) {
        throw new Error("cloudflare_deployments_response_invalid");
      }

      const deployment = payload.result.find(
        (candidate) =>
          candidate.environment === "production" &&
          candidate.deployment_trigger?.metadata?.branch === input.productionBranch &&
          candidate.deployment_trigger?.metadata?.commit_hash === input.commitSha,
      );

      if (deployment) {
        if (deployment.is_skipped) {
          throw new Error("cloudflare_deployment_skipped");
        }

        if (
          deployment.latest_stage?.status === "failure" ||
          deployment.latest_stage?.status === "canceled"
        ) {
          throw new Error("cloudflare_deployment_failed");
        }

        if (deployment.latest_stage?.status === "success") {
          if (!deployment.id || !deployment.url) {
            throw new Error("cloudflare_deployment_response_invalid");
          }

          return {
            deploymentId: deployment.id,
            deploymentUrl: deployment.url,
            environment: "production",
            branch: input.productionBranch,
            commitSha: input.commitSha,
          };
        }
      }

      if (attempt < this.maxAttempts) {
        await this.sleep(this.pollIntervalMs);
      }
    }

    throw new Error("cloudflare_deployment_timeout");
  }
}
