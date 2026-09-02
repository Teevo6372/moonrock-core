import { describe, expect, it, vi } from "vitest";
import {
  parseOperatorReleaseEnvelope,
  readOperatorReleaseEnvironment,
  runOperatorProductionRelease,
  type OperatorReleaseEnvelope,
} from "./operator-release";

const envelope: OperatorReleaseEnvelope = {
  candidate: {
    request: {
      id: "req-700",
      siteId: "reference",
      requestedBy: "customer",
      customerMessage: "Update the hero",
      intent: "update_hero",
      risk: "low",
      mode: "auto",
      requestedChanges: [
        {
          target: "pages.home.hero.headline",
          operation: "update",
          value: "Build Your Website With Nova",
        },
      ],
      createdAt: "2026-09-02T00:00:00.000Z",
    },
    previewUrl: "https://preview.example.test/req-700",
    revision: {
      repository: "Teevo6372/moonrock-core",
      branch: "site/reference/req-700",
      commitSha: "target700",
    },
    executionSummary: "updated hero",
    assetIds: [],
  },
  authorization: {
    requestId: "req-700",
    siteId: "reference",
    revision: {
      repository: "Teevo6372/moonrock-core",
      branch: "site/reference/req-700",
      commitSha: "target700",
    },
    previewUrl: "https://preview.example.test/req-700",
    source: "policy",
    authorizedBy: "nova-policy",
    authorizedAt: "2026-09-02T00:05:00.000Z",
  },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("operator release wiring", () => {
  it("reads all required production configuration from environment variables", () => {
    expect(
      readOperatorReleaseEnvironment({
        MOONROCK_GITHUB_TOKEN: " github-token ",
        MOONROCK_CLOUDFLARE_ACCOUNT_ID: "account-1",
        MOONROCK_CLOUDFLARE_API_TOKEN: "cf-token",
        MOONROCK_CLOUDFLARE_PROJECT: "reference-project",
        MOONROCK_PRODUCTION_BRANCH: "main",
        MOONROCK_EXPECTED_PRODUCTION_SHA: "current-main",
      }),
    ).toEqual({
      githubToken: "github-token",
      cloudflareAccountId: "account-1",
      cloudflareApiToken: "cf-token",
      cloudflareProjectName: "reference-project",
      productionBranch: "main",
      expectedProductionCommitSha: "current-main",
    });
  });

  it("fails closed when required environment configuration is missing", () => {
    expect(() => readOperatorReleaseEnvironment({})).toThrow(
      "operator_release_env_missing:MOONROCK_GITHUB_TOKEN",
    );
  });

  it("rejects malformed release envelopes before any provider call", () => {
    expect(() => parseOperatorReleaseEnvelope({ candidate: {}, authorization: {} })).toThrow(
      "operator_release_envelope_invalid",
    );
  });

  it("runs an authorized release through GitHub promotion and exact Cloudflare verification", async () => {
    const githubFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ object: { sha: "current-main" } }))
      .mockResolvedValueOnce(jsonResponse({ object: { sha: "target700" } }));

    const cloudflareFetch = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        result: [
          {
            id: "deployment-700",
            url: "https://reference.pages.dev",
            environment: "production",
            is_skipped: false,
            latest_stage: { status: "success" },
            deployment_trigger: {
              metadata: {
                branch: "main",
                commit_hash: "target700",
              },
            },
          },
        ],
      }),
    );

    await expect(
      runOperatorProductionRelease(
        envelope,
        {
          githubToken: "github-token",
          cloudflareAccountId: "account-1",
          cloudflareApiToken: "cf-token",
          cloudflareProjectName: "reference-project",
          productionBranch: "main",
          expectedProductionCommitSha: "current-main",
        },
        {
          githubFetch,
          cloudflareFetch,
          sleep: vi.fn().mockResolvedValue(undefined),
        },
      ),
    ).resolves.toEqual({
      deploymentId: "deployment-700",
      deploymentUrl: "https://reference.pages.dev",
    });

    expect(githubFetch).toHaveBeenCalledTimes(2);
    expect(cloudflareFetch).toHaveBeenCalledOnce();
  });

  it("does not touch GitHub or Cloudflare when authorization mismatches the reviewed release", async () => {
    const githubFetch = vi.fn();
    const cloudflareFetch = vi.fn();

    const result = await runOperatorProductionRelease(
      {
        ...envelope,
        authorization: {
          ...envelope.authorization,
          revision: {
            ...envelope.authorization.revision,
            commitSha: "wrong",
          },
        },
      },
      {
        githubToken: "github-token",
        cloudflareAccountId: "account-1",
        cloudflareApiToken: "cf-token",
        cloudflareProjectName: "reference-project",
        productionBranch: "main",
        expectedProductionCommitSha: "current-main",
      },
      { githubFetch, cloudflareFetch },
    );

    expect(result).toMatchObject({ status: "blocked", reason: "revision_mismatch" });
    expect(githubFetch).not.toHaveBeenCalled();
    expect(cloudflareFetch).not.toHaveBeenCalled();
  });
});
