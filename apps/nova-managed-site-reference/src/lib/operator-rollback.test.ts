import { describe, expect, it, vi } from "vitest";
import { runOperatorRollback } from "./operator-rollback";
import type { OperatorRollbackEnvelope } from "./operator-rollback";

const envelope: OperatorRollbackEnvelope = {
  evidence: {
    schemaVersion: "1",
    requestId: "req-700",
    siteId: "reference",
    previewUrl: "https://preview.example.test/req-700",
    previousProductionRevision: {
      repository: "Teevo6372/moonrock-core",
      branch: "main",
      commitSha: "previous700",
    },
    releasedRevision: {
      repository: "Teevo6372/moonrock-core",
      branch: "site/reference/req-700",
      commitSha: "released700",
    },
    authorization: {
      source: "customer",
      authorizedBy: "customer-700",
      authorizedAt: "2026-09-02T00:30:00.000Z",
    },
    deployment: {
      deploymentId: "deployment-700",
      deploymentUrl: "https://reference.pages.dev",
    },
    recordedAt: "2026-09-02T00:31:00.000Z",
  },
  authorization: {
    requestId: "req-700",
    siteId: "reference",
    releasedCommitSha: "released700",
    targetCommitSha: "previous700",
    authorizedBy: "operator-700",
    authorizedAt: "2026-09-02T00:35:00.000Z",
    source: "operator",
  },
};

describe("operator rollback wiring", () => {
  it("blocks mismatched authorization before making any GitHub call", async () => {
    const githubFetch = vi.fn();
    const result = await runOperatorRollback(
      {
        ...envelope,
        authorization: { ...envelope.authorization, targetCommitSha: "arbitrary" },
      },
      { githubToken: "token", productionBranch: "main" },
      { githubFetch },
    );

    expect(result).toMatchObject({ status: "blocked", reason: "rollback_target_mismatch" });
    expect(githubFetch).not.toHaveBeenCalled();
  });
});
