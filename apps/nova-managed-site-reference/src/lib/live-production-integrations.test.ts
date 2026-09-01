import { describe, expect, it, vi } from "vitest";
import {
  CloudflareApiProductionDeploymentWatcher,
  GitHubApiProductionBranchPromoter,
  type FetchLike,
} from "./live-production-integrations";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("GitHub live production branch promoter", () => {
  it("checks the expected production HEAD and performs only a non-forced ref update", async () => {
    const fetchFn = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(jsonResponse({ object: { sha: "current-main" } }))
      .mockResolvedValueOnce(jsonResponse({ object: { sha: "approved-commit" } }));

    const promoter = new GitHubApiProductionBranchPromoter(
      {
        token: "github-test-token",
        apiBaseUrl: "https://github.example.test",
      },
      fetchFn,
    );

    await expect(
      promoter.promoteFastForward({
        repository: "Teevo6372/moonrock-core",
        productionBranch: "main",
        expectedCurrentCommitSha: "current-main",
        targetCommitSha: "approved-commit",
      }),
    ).resolves.toEqual({
      productionRevision: {
        repository: "Teevo6372/moonrock-core",
        branch: "main",
        commitSha: "approved-commit",
      },
    });

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(fetchFn.mock.calls[0]?.[0]).toBe(
      "https://github.example.test/repos/Teevo6372/moonrock-core/git/ref/heads/main",
    );
    expect(fetchFn.mock.calls[1]?.[0]).toBe(
      "https://github.example.test/repos/Teevo6372/moonrock-core/git/refs/heads/main",
    );

    const updateInit = fetchFn.mock.calls[1]?.[1];
    expect(updateInit?.method).toBe("PATCH");
    expect(JSON.parse(String(updateInit?.body))).toEqual({
      sha: "approved-commit",
      force: false,
    });
  });

  it("stops before mutation when the production HEAD changed since authorization", async () => {
    const fetchFn = vi
      .fn<FetchLike>()
      .mockResolvedValue(jsonResponse({ object: { sha: "newer-main" } }));
    const promoter = new GitHubApiProductionBranchPromoter(
      { token: "github-test-token", apiBaseUrl: "https://github.example.test" },
      fetchFn,
    );

    await expect(
      promoter.promoteFastForward({
        repository: "Teevo6372/moonrock-core",
        productionBranch: "main",
        expectedCurrentCommitSha: "current-main",
        targetCommitSha: "approved-commit",
      }),
    ).rejects.toThrow("production_head_changed");

    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it("rejects a GitHub ref update that does not report the approved commit", async () => {
    const fetchFn = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(jsonResponse({ object: { sha: "current-main" } }))
      .mockResolvedValueOnce(jsonResponse({ object: { sha: "different" } }));
    const promoter = new GitHubApiProductionBranchPromoter(
      { token: "github-test-token", apiBaseUrl: "https://github.example.test" },
      fetchFn,
    );

    await expect(
      promoter.promoteFastForward({
        repository: "Teevo6372/moonrock-core",
        productionBranch: "main",
        expectedCurrentCommitSha: "current-main",
        targetCommitSha: "approved-commit",
      }),
    ).rejects.toThrow("github_ref_update_mismatch");
  });
});

describe("Cloudflare live production deployment watcher", () => {
  it("polls production deployments until the exact approved branch and commit succeeds", async () => {
    const fetchFn = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          result: [
            {
              id: "deploy-1",
              url: "https://reference.pages.dev",
              environment: "production",
              latest_stage: { status: "active" },
              deployment_trigger: {
                metadata: { branch: "main", commit_hash: "approved-commit" },
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          result: [
            {
              id: "deploy-1",
              url: "https://reference.pages.dev",
              environment: "production",
              is_skipped: false,
              latest_stage: { status: "success" },
              deployment_trigger: {
                metadata: { branch: "main", commit_hash: "approved-commit" },
              },
            },
          ],
        }),
      );
    const sleep = vi.fn().mockResolvedValue(undefined);
    const watcher = new CloudflareApiProductionDeploymentWatcher(
      {
        accountId: "account-1",
        apiToken: "cloudflare-test-token",
        projectBySiteId: { reference: "reference-project" },
        apiBaseUrl: "https://cloudflare.example.test/client/v4",
        pollIntervalMs: 1,
        maxAttempts: 2,
      },
      fetchFn,
      sleep,
    );

    await expect(
      watcher.waitForProductionDeployment({
        siteId: "reference",
        productionBranch: "main",
        commitSha: "approved-commit",
      }),
    ).resolves.toEqual({
      deploymentId: "deploy-1",
      deploymentUrl: "https://reference.pages.dev",
      environment: "production",
      branch: "main",
      commitSha: "approved-commit",
    });

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledOnce();
    const firstUrl = String(fetchFn.mock.calls[0]?.[0]);
    expect(firstUrl).toContain("/accounts/account-1/pages/projects/reference-project/deployments");
    expect(firstUrl).toContain("env=production");
  });

  it("ignores unrelated deployments and times out rather than accepting the wrong revision", async () => {
    const fetchFn = vi.fn<FetchLike>().mockResolvedValue(
      jsonResponse({
        success: true,
        result: [
          {
            id: "wrong",
            url: "https://reference.pages.dev",
            environment: "production",
            latest_stage: { status: "success" },
            deployment_trigger: {
              metadata: { branch: "main", commit_hash: "different" },
            },
          },
        ],
      }),
    );
    const watcher = new CloudflareApiProductionDeploymentWatcher(
      {
        accountId: "account-1",
        apiToken: "cloudflare-test-token",
        projectBySiteId: { reference: "reference-project" },
        apiBaseUrl: "https://cloudflare.example.test/client/v4",
        pollIntervalMs: 1,
        maxAttempts: 1,
      },
      fetchFn,
      vi.fn(),
    );

    await expect(
      watcher.waitForProductionDeployment({
        siteId: "reference",
        productionBranch: "main",
        commitSha: "approved-commit",
      }),
    ).rejects.toThrow("cloudflare_deployment_timeout");
  });

  it("fails immediately when the exact deployment is skipped, failed, or canceled", async () => {
    const fetchFn = vi.fn<FetchLike>().mockResolvedValue(
      jsonResponse({
        success: true,
        result: [
          {
            id: "deploy-1",
            url: "https://reference.pages.dev",
            environment: "production",
            latest_stage: { status: "failure" },
            deployment_trigger: {
              metadata: { branch: "main", commit_hash: "approved-commit" },
            },
          },
        ],
      }),
    );
    const watcher = new CloudflareApiProductionDeploymentWatcher(
      {
        accountId: "account-1",
        apiToken: "cloudflare-test-token",
        projectBySiteId: { reference: "reference-project" },
        apiBaseUrl: "https://cloudflare.example.test/client/v4",
        maxAttempts: 3,
      },
      fetchFn,
      vi.fn(),
    );

    await expect(
      watcher.waitForProductionDeployment({
        siteId: "reference",
        productionBranch: "main",
        commitSha: "approved-commit",
      }),
    ).rejects.toThrow("cloudflare_deployment_failed");

    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it("requires an explicit site-to-project mapping", async () => {
    const watcher = new CloudflareApiProductionDeploymentWatcher(
      {
        accountId: "account-1",
        apiToken: "cloudflare-test-token",
        projectBySiteId: {},
        maxAttempts: 1,
      },
      vi.fn<FetchLike>(),
      vi.fn(),
    );

    await expect(
      watcher.waitForProductionDeployment({
        siteId: "unknown",
        productionBranch: "main",
        commitSha: "approved-commit",
      }),
    ).rejects.toThrow("cloudflare_project_not_configured");
  });
});
