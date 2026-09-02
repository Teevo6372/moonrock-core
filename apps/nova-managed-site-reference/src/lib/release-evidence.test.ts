import { describe, expect, it, vi } from "vitest";
import type { ProductionReleaseResult, ReleaseAuthorization, ReleaseCandidate } from "./release-gate";
import {
  createProductionReleaseEvidence,
  decideRollback,
  executeAuthorizedRollback,
  type RollbackAuthorization,
  type RollbackRevertProvider,
} from "./release-evidence";

const candidate: ReleaseCandidate = {
  request: {
    id: "req-700",
    siteId: "reference",
    requestedBy: "customer",
    customerMessage: "Update the homepage",
    intent: "update_homepage",
    risk: "moderate",
    mode: "preview_required",
    requestedChanges: [{ target: "pages.home", operation: "update", value: "new" }],
    createdAt: "2026-09-02T00:20:00.000Z",
  },
  previewUrl: "https://preview.example.test/req-700",
  revision: {
    repository: "Teevo6372/moonrock-core",
    branch: "site/reference/req-700",
    commitSha: "released700",
  },
  executionSummary: "updated homepage",
  assetIds: [],
};

const releaseAuthorization: ReleaseAuthorization = {
  requestId: "req-700",
  siteId: "reference",
  revision: candidate.revision,
  previewUrl: candidate.previewUrl,
  source: "customer",
  authorizedBy: "customer-700",
  authorizedAt: "2026-09-02T00:25:00.000Z",
};

const releaseResult: ProductionReleaseResult = {
  deploymentId: "deployment-700",
  deploymentUrl: "https://reference.pages.dev",
};

const evidence = createProductionReleaseEvidence({
  candidate,
  authorization: releaseAuthorization,
  previousProductionRevision: {
    repository: "Teevo6372/moonrock-core",
    branch: "main",
    commitSha: "previous700",
  },
  result: releaseResult,
  recordedAt: "2026-09-02T00:26:00.000Z",
});

const rollbackAuthorization: RollbackAuthorization = {
  requestId: "req-700",
  siteId: "reference",
  releasedCommitSha: "released700",
  targetCommitSha: "previous700",
  source: "operator",
  authorizedBy: "operator-1",
  authorizedAt: "2026-09-02T00:30:00.000Z",
};

describe("production release evidence", () => {
  it("records the exact prior and released revisions with authorization and deployment evidence", () => {
    expect(evidence).toEqual({
      schemaVersion: "1",
      requestId: "req-700",
      siteId: "reference",
      previewUrl: "https://preview.example.test/req-700",
      previousProductionRevision: {
        repository: "Teevo6372/moonrock-core",
        branch: "main",
        commitSha: "previous700",
      },
      releasedRevision: candidate.revision,
      authorization: {
        source: "customer",
        authorizedBy: "customer-700",
        authorizedAt: "2026-09-02T00:25:00.000Z",
      },
      deployment: releaseResult,
      recordedAt: "2026-09-02T00:26:00.000Z",
    });
  });
});

describe("rollback gate", () => {
  it("authorizes only an operator rollback to the exact previously recorded production revision", () => {
    expect(decideRollback(evidence, rollbackAuthorization).status).toBe("authorized");
  });

  it("blocks a rollback targeting an arbitrary commit", () => {
    expect(
      decideRollback(evidence, {
        ...rollbackAuthorization,
        targetCommitSha: "arbitrary",
      }),
    ).toMatchObject({ status: "blocked", reason: "rollback_target_mismatch" });
  });

  it("blocks a rollback when production no longer matches the released revision", () => {
    expect(
      decideRollback(evidence, {
        ...rollbackAuthorization,
        releasedCommitSha: "newer-production",
      }),
    ).toMatchObject({ status: "blocked", reason: "released_revision_mismatch" });
  });

  it("never invokes the revert provider without matching rollback authorization", async () => {
    const createRevert = vi.fn();
    const provider: RollbackRevertProvider = { createRevert };

    await expect(
      executeAuthorizedRollback(evidence, "main", provider, {
        ...rollbackAuthorization,
        targetCommitSha: "arbitrary",
      }),
    ).resolves.toMatchObject({ status: "blocked", reason: "rollback_target_mismatch" });

    expect(createRevert).not.toHaveBeenCalled();
  });

  it("uses a revert request instead of a force reset when rollback is authorized", async () => {
    const createRevert = vi.fn().mockResolvedValue({
      revision: {
        repository: "Teevo6372/moonrock-core",
        branch: "main",
        commitSha: "revert700",
      },
    });
    const provider: RollbackRevertProvider = { createRevert };

    await expect(
      executeAuthorizedRollback(evidence, "main", provider, rollbackAuthorization),
    ).resolves.toEqual({
      revision: {
        repository: "Teevo6372/moonrock-core",
        branch: "main",
        commitSha: "revert700",
      },
    });

    expect(createRevert).toHaveBeenCalledWith({
      repository: "Teevo6372/moonrock-core",
      productionBranch: "main",
      expectedCurrentCommitSha: "released700",
      previousProductionCommitSha: "previous700",
      releasedCommitSha: "released700",
      authorizedBy: "operator-1",
      authorizedAt: "2026-09-02T00:30:00.000Z",
    });
  });
});
