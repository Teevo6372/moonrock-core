import type { RollbackRevertProvider, RollbackRevertRequest, RollbackRevertResult } from "./release-evidence";
import type { FetchLike } from "./live-production-integrations";

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
  object?: { sha?: string };
}

interface GitHubCommitResponse {
  sha?: string;
  tree?: { sha?: string };
}

export interface GitHubApiRollbackRevertProviderConfig {
  token: string;
  apiBaseUrl?: string;
  apiVersion?: string;
}

/**
 * Creates a new production commit whose tree exactly matches the previously recorded
 * production revision. Production history is preserved: the branch is never force-reset.
 */
export class GitHubApiRollbackRevertProvider implements RollbackRevertProvider {
  private readonly apiBaseUrl: string;
  private readonly apiVersion: string;

  constructor(
    private readonly config: GitHubApiRollbackRevertProviderConfig,
    private readonly fetchFn: FetchLike = fetch,
  ) {
    if (!config.token) {
      throw new Error("github_token_missing");
    }
    this.apiBaseUrl = (config.apiBaseUrl ?? "https://api.github.com").replace(/\/$/, "");
    this.apiVersion = config.apiVersion ?? "2026-03-10";
  }

  async createRevert(request: RollbackRevertRequest): Promise<RollbackRevertResult> {
    const { owner, repo } = parseRepository(request.repository);
    const encodedOwner = encodeURIComponent(owner);
    const encodedRepo = encodeURIComponent(repo);
    const encodedBranch = encodeBranch(request.productionBranch);
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${this.config.token}`,
      "X-GitHub-Api-Version": this.apiVersion,
    };

    const refUrl = `${this.apiBaseUrl}/repos/${encodedOwner}/${encodedRepo}/git/ref/heads/${encodedBranch}`;
    const updateRefUrl = `${this.apiBaseUrl}/repos/${encodedOwner}/${encodedRepo}/git/refs/heads/${encodedBranch}`;

    const currentResponse = await this.fetchFn(refUrl, { headers });
    requireOk(currentResponse, "rollback_head_read_failed");
    const current = (await currentResponse.json()) as GitHubRefResponse;
    if (current.object?.sha !== request.expectedCurrentCommitSha) {
      throw new Error("rollback_production_head_changed");
    }
    if (request.expectedCurrentCommitSha !== request.releasedCommitSha) {
      throw new Error("rollback_released_revision_mismatch");
    }

    const previousCommitUrl = `${this.apiBaseUrl}/repos/${encodedOwner}/${encodedRepo}/git/commits/${encodeURIComponent(request.previousProductionCommitSha)}`;
    const previousResponse = await this.fetchFn(previousCommitUrl, { headers });
    requireOk(previousResponse, "rollback_previous_commit_read_failed");
    const previousCommit = (await previousResponse.json()) as GitHubCommitResponse;
    const previousTreeSha = previousCommit.tree?.sha;
    if (!previousTreeSha) {
      throw new Error("rollback_previous_tree_missing");
    }

    const createCommitUrl = `${this.apiBaseUrl}/repos/${encodedOwner}/${encodedRepo}/git/commits`;
    const createResponse = await this.fetchFn(createCommitUrl, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `rollback: restore ${request.previousProductionCommitSha}\n\nAuthorized by ${request.authorizedBy} at ${request.authorizedAt}`,
        tree: previousTreeSha,
        parents: [request.releasedCommitSha],
      }),
    });
    requireOk(createResponse, "rollback_commit_create_failed");
    const created = (await createResponse.json()) as GitHubCommitResponse;
    if (!created.sha) {
      throw new Error("rollback_commit_response_invalid");
    }

    const updateResponse = await this.fetchFn(updateRefUrl, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ sha: created.sha, force: false }),
    });
    requireOk(updateResponse, "rollback_ref_update_failed");
    const updated = (await updateResponse.json()) as GitHubRefResponse;
    if (updated.object?.sha !== created.sha) {
      throw new Error("rollback_ref_update_mismatch");
    }

    return {
      revision: {
        repository: request.repository,
        branch: request.productionBranch,
        commitSha: created.sha,
      },
    };
  }
}

export interface ProductionDeploymentVerificationRequest {
  deploymentUrl: string;
  expectedContentMarker: string;
}

export interface ProductionDeploymentVerificationResult {
  deploymentUrl: string;
  statusCode: number;
  markerMatched: true;
}

export interface ProductionDeploymentVerifier {
  verify(request: ProductionDeploymentVerificationRequest): Promise<ProductionDeploymentVerificationResult>;
}

export class HttpProductionDeploymentVerifier implements ProductionDeploymentVerifier {
  constructor(private readonly fetchFn: FetchLike = fetch) {}

  async verify(
    request: ProductionDeploymentVerificationRequest,
  ): Promise<ProductionDeploymentVerificationResult> {
    const url = new URL(request.deploymentUrl);
    if (url.protocol !== "https:") {
      throw new Error("production_verification_https_required");
    }
    if (!request.expectedContentMarker.trim()) {
      throw new Error("production_verification_marker_missing");
    }

    const response = await this.fetchFn(url, {
      method: "GET",
      headers: { Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
    });
    requireOk(response, "production_verification_http_failed");
    const body = await response.text();
    if (!body.includes(request.expectedContentMarker)) {
      throw new Error("production_verification_marker_mismatch");
    }

    return {
      deploymentUrl: request.deploymentUrl,
      statusCode: response.status,
      markerMatched: true,
    };
  }
}
