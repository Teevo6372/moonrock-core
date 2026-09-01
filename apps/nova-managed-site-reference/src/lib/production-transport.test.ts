import { describe, expect, it, vi } from "vitest";
import type { CloudflareProductionReleaseTask } from "./production-deployment";
import {
  GitBackedCloudflareProductionTransport,
  type CloudflareProductionDeploymentWatcher,
  type ProductionBranchPromoter,
} from "./production-transport";

const task: CloudflareProductionReleaseTask = {
  schemaVersion: "1",
  requestId: "req-600",
  siteId: "reference",
  revision: {
    repository: "Teevo6372/moonrock-core",
    branch: "site/reference/req-600",
    commitSha: "target600",
  },
  previewUrl: "https://preview.example.test/req-600",
  executionSummary: "updated homepage",
  assetIds: [],
  authorization: {
    source: "customer",
    authorizedBy: "customer-600",
    authorizedAt: "2026-09-02T00:10:00.000Z",
  },
  constraints: {
    exactRevisionRequired: true,
    productionPublishAllowed: true,
    dnsMutationAllowed: false,
    customDomainMutationAllowed: false,
  },
};

describe("git-backed Cloudflare production transport", () => {
  it("promotes only the reviewed commit and verifies Cloudflare deployed that exact revision", async () => {
    const promoteFastForward = vi.fn().mockResolvedValue({
      productionRevision: {
        repository: "Teevo6372/moonrock-core",
        branch: "main",
        commitSha: "target600",
      },
    });
    const waitForProductionDeployment = vi.fn().mockResolvedValue({
      deploymentId: "deployment-600",
      deploymentUrl: "https://reference.pages.dev",
      environment: "production",
      branch: "main",
      commitSha: "target600",
    });

    const promoter: ProductionBranchPromoter = { promoteFastForward };
    const watcher: CloudflareProductionDeploymentWatcher = { waitForProductionDeployment };
    const transport = new GitBackedCloudflareProductionTransport(
      {
        productionBranch: "main",
        expectedProductionCommitSha: "current-main",
      },
      promoter,
      watcher,
    );

    await expect(transport.publish(task)).resolves.toEqual({
      deploymentId: "deployment-600",
      deploymentUrl: "https://reference.pages.dev",
    });

    expect(promoteFastForward).toHaveBeenCalledWith({
      repository: "Teevo6372/moonrock-core",
      productionBranch: "main",
      expectedCurrentCommitSha: "current-main",
      targetCommitSha: "target600",
    });
    expect(waitForProductionDeployment).toHaveBeenCalledWith({
      siteId: "reference",
      productionBranch: "main",
      commitSha: "target600",
    });
  });

  it("stops before Cloudflare verification when Git promotion does not land on the reviewed revision", async () => {
    const promoteFastForward = vi.fn().mockResolvedValue({
      productionRevision: {
        repository: "Teevo6372/moonrock-core",
        branch: "main",
        commitSha: "different",
      },
    });
    const waitForProductionDeployment = vi.fn();

    const transport = new GitBackedCloudflareProductionTransport(
      {
        productionBranch: "main",
        expectedProductionCommitSha: "current-main",
      },
      { promoteFastForward },
      { waitForProductionDeployment },
    );

    await expect(transport.publish(task)).rejects.toThrow("production_revision_mismatch");
    expect(waitForProductionDeployment).not.toHaveBeenCalled();
  });

  it("rejects a Cloudflare production deployment that reports a different commit", async () => {
    const promoteFastForward = vi.fn().mockResolvedValue({
      productionRevision: {
        repository: "Teevo6372/moonrock-core",
        branch: "main",
        commitSha: "target600",
      },
    });
    const waitForProductionDeployment = vi.fn().mockResolvedValue({
      deploymentId: "deployment-600",
      deploymentUrl: "https://reference.pages.dev",
      environment: "production",
      branch: "main",
      commitSha: "wrong",
    });

    const transport = new GitBackedCloudflareProductionTransport(
      {
        productionBranch: "main",
        expectedProductionCommitSha: "current-main",
      },
      { promoteFastForward },
      { waitForProductionDeployment },
    );

    await expect(transport.publish(task)).rejects.toThrow("cloudflare_revision_mismatch");
  });

  it("rejects runtime input that expands production scope into DNS or custom-domain mutation", async () => {
    const unsafeRuntimeInput = {
      ...task,
      constraints: {
        ...task.constraints,
        dnsMutationAllowed: true,
      },
    };
    const unsafeTask = unsafeRuntimeInput as unknown as CloudflareProductionReleaseTask;

    const promoteFastForward = vi.fn();
    const waitForProductionDeployment = vi.fn();
    const transport = new GitBackedCloudflareProductionTransport(
      {
        productionBranch: "main",
        expectedProductionCommitSha: "current-main",
      },
      { promoteFastForward },
      { waitForProductionDeployment },
    );

    await expect(transport.publish(unsafeTask)).rejects.toThrow("production_scope_invalid");
    expect(promoteFastForward).not.toHaveBeenCalled();
    expect(waitForProductionDeployment).not.toHaveBeenCalled();
  });
});
