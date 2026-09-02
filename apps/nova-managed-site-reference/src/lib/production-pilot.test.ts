import { describe, expect, it, vi } from "vitest";
import type { OperatorReleaseEnvelope } from "./operator-release";
import { runProductionPilot } from "./production-pilot";

const envelope: OperatorReleaseEnvelope = {
  candidate: {
    request: {
      id: "req-pilot-1",
      siteId: "reference",
      requestedBy: "customer",
      customerMessage: "Update the hero headline",
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
      createdAt: "2026-09-02T00:20:00.000Z",
    },
    previewUrl: "https://preview.example.test/req-pilot-1",
    revision: {
      repository: "Teevo6372/moonrock-core",
      branch: "site/reference/req-pilot-1",
      commitSha: "pilot-target",
    },
    executionSummary: "updated hero headline",
    assetIds: [],
  },
  authorization: {
    requestId: "req-pilot-1",
    siteId: "reference",
    revision: {
      repository: "Teevo6372/moonrock-core",
      branch: "site/reference/req-pilot-1",
      commitSha: "pilot-target",
    },
    previewUrl: "https://preview.example.test/req-pilot-1",
    source: "operator",
    authorizedBy: "operator",
    authorizedAt: "2026-09-02T00:25:00.000Z",
  },
};

const environment = {
  githubToken: "github-token",
  cloudflareAccountId: "account-1",
  cloudflareApiToken: "cf-token",
  cloudflareProjectName: "reference-project",
  productionBranch: "main",
  expectedProductionCommitSha: "pilot-before",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("controlled production pilot", () => {
  it("releases, verifies the live marker, and records rollback-ready evidence", async () => {
    const githubFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ object: { sha: "pilot-before" } }))
      .mockResolvedValueOnce(jsonResponse({ object: { sha: "pilot-target" } }));

    const cloudflareFetch = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        result: [
          {
            id: "deployment-pilot",
            url: "https://reference.pages.dev",
            environment: "production",
            is_skipped: false,
            latest_stage: { status: "success" },
            deployment_trigger: {
              metadata: {
                branch: "main",
                commit_hash: "pilot-target",
              },
            },
          },
        ],
      }),
    );

    const verificationFetch = vi.fn().mockResolvedValue(
      new Response("<html><body>moonrock-pilot-marker</body></html>", { status: 200 }),
    );

    const result = await runProductionPilot({
      envelope,
      environment,
      expectedContentMarker: "moonrock-pilot-marker",
      runtime: {
        githubFetch,
        cloudflareFetch,
        verificationFetch,
        sleep: vi.fn().mockResolvedValue(undefined),
        now: () => "2026-09-02T00:30:00.000Z",
      },
    });

    expect(result).toMatchObject({
      status: "verified",
      release: {
        deploymentId: "deployment-pilot",
        deploymentUrl: "https://reference.pages.dev",
      },
      verification: {
        deploymentUrl: "https://reference.pages.dev",
        statusCode: 200,
        markerMatched: true,
      },
      evidence: {
        previousProductionRevision: {
          repository: "Teevo6372/moonrock-core",
          branch: "main",
          commitSha: "pilot-before",
        },
        releasedRevision: {
          repository: "Teevo6372/moonrock-core",
          branch: "site/reference/req-pilot-1",
          commitSha: "pilot-target",
        },
        recordedAt: "2026-09-02T00:30:00.000Z",
      },
    });
  });

  it("rejects non-low-risk candidates before any provider call", async () => {
    const githubFetch = vi.fn();
    const cloudflareFetch = vi.fn();
    const verificationFetch = vi.fn();

    await expect(
      runProductionPilot({
        envelope: {
          ...envelope,
          candidate: {
            ...envelope.candidate,
            request: {
              ...envelope.candidate.request,
              risk: "moderate",
              mode: "preview_required",
            },
          },
        },
        environment,
        expectedContentMarker: "moonrock-pilot-marker",
        runtime: { githubFetch, cloudflareFetch, verificationFetch },
      }),
    ).rejects.toThrow("production_pilot_low_risk_required");

    expect(githubFetch).not.toHaveBeenCalled();
    expect(cloudflareFetch).not.toHaveBeenCalled();
    expect(verificationFetch).not.toHaveBeenCalled();
  });

  it("does not verify or record evidence when release authorization is blocked", async () => {
    const githubFetch = vi.fn();
    const cloudflareFetch = vi.fn();
    const verificationFetch = vi.fn();

    const result = await runProductionPilot({
      envelope: {
        ...envelope,
        authorization: {
          ...envelope.authorization,
          revision: {
            ...envelope.authorization.revision,
            commitSha: "wrong",
          },
        },
      },
      environment,
      expectedContentMarker: "moonrock-pilot-marker",
      runtime: { githubFetch, cloudflareFetch, verificationFetch },
    });

    expect(result).toMatchObject({
      status: "blocked",
      decision: { reason: "revision_mismatch" },
    });
    expect(githubFetch).not.toHaveBeenCalled();
    expect(cloudflareFetch).not.toHaveBeenCalled();
    expect(verificationFetch).not.toHaveBeenCalled();
  });
});
