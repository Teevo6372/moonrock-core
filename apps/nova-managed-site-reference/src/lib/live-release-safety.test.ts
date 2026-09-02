import { describe, expect, it, vi } from "vitest";
import {
  GitHubApiRollbackRevertProvider,
  HttpProductionDeploymentVerifier,
} from "./live-release-safety";
import type { RollbackRevertRequest } from "./release-evidence";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const rollbackRequest: RollbackRevertRequest = {
  repository: "Teevo6372/moonrock-core",
  productionBranch: "main",
  expectedCurrentCommitSha: "released123",
  previousProductionCommitSha: "previous456",
  releasedCommitSha: "released123",
  authorizedBy: "operator-1",
  authorizedAt: "2026-09-02T00:20:00.000Z",
};

describe("GitHub API rollback revert provider", () => {
  it("creates a new rollback commit from the previous production tree and fast-forwards production", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ object: { sha: "released123" } }))
      .mockResolvedValueOnce(jsonResponse({ sha: "previous456", tree: { sha: "tree456" } }))
      .mockResolvedValueOnce(jsonResponse({ sha: "rollback789" }, 201))
      .mockResolvedValueOnce(jsonResponse({ object: { sha: "rollback789" } }));

    const provider = new GitHubApiRollbackRevertProvider(
      { token: "token", apiBaseUrl: "https://github.test" },
      fetchFn,
    );

    await expect(provider.createRevert(rollbackRequest)).resolves.toEqual({
      revision: {
        repository: "Teevo6372/moonrock-core",
        branch: "main",
        commitSha: "rollback789",
      },
    });

    const createCall = fetchFn.mock.calls[2];
    expect(createCall?.[0]).toBe("https://github.test/repos/Teevo6372/moonrock-core/git/commits");
    expect(JSON.parse(String(createCall?.[1]?.body))).toMatchObject({
      tree: "tree456",
      parents: ["released123"],
    });

    const updateCall = fetchFn.mock.calls[3];
    expect(JSON.parse(String(updateCall?.[1]?.body))).toEqual({
      sha: "rollback789",
      force: false,
    });
  });

  it("stops before reading the prior tree when production has moved", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(jsonResponse({ object: { sha: "newer999" } }));
    const provider = new GitHubApiRollbackRevertProvider(
      { token: "token", apiBaseUrl: "https://github.test" },
      fetchFn,
    );

    await expect(provider.createRevert(rollbackRequest)).rejects.toThrow(
      "rollback_production_head_changed",
    );
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("never force-updates the production branch", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ object: { sha: "released123" } }))
      .mockResolvedValueOnce(jsonResponse({ tree: { sha: "tree456" } }))
      .mockResolvedValueOnce(jsonResponse({ sha: "rollback789" }, 201))
      .mockResolvedValueOnce(jsonResponse({ object: { sha: "rollback789" } }));
    const provider = new GitHubApiRollbackRevertProvider(
      { token: "token", apiBaseUrl: "https://github.test" },
      fetchFn,
    );

    await provider.createRevert(rollbackRequest);
    const updateBody = JSON.parse(String(fetchFn.mock.calls[3]?.[1]?.body));
    expect(updateBody.force).toBe(false);
  });
});

describe("HTTP production deployment verifier", () => {
  it("accepts only a successful HTTPS response containing the configured marker", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response("<html><body>Moonrock Reference Site</body></html>", { status: 200 }),
    );
    const verifier = new HttpProductionDeploymentVerifier(fetchFn);

    await expect(
      verifier.verify({
        deploymentUrl: "https://reference.pages.dev",
        expectedContentMarker: "Moonrock Reference Site",
      }),
    ).resolves.toEqual({
      deploymentUrl: "https://reference.pages.dev",
      statusCode: 200,
      markerMatched: true,
    });
  });

  it("rejects a successful HTTP response whose content does not identify the expected site", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("wrong site", { status: 200 }));
    const verifier = new HttpProductionDeploymentVerifier(fetchFn);

    await expect(
      verifier.verify({
        deploymentUrl: "https://reference.pages.dev",
        expectedContentMarker: "Moonrock Reference Site",
      }),
    ).rejects.toThrow("production_verification_marker_mismatch");
  });

  it("rejects non-HTTPS verification targets before making a network call", async () => {
    const fetchFn = vi.fn();
    const verifier = new HttpProductionDeploymentVerifier(fetchFn);

    await expect(
      verifier.verify({
        deploymentUrl: "http://reference.pages.dev",
        expectedContentMarker: "Moonrock Reference Site",
      }),
    ).rejects.toThrow("production_verification_https_required");
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
