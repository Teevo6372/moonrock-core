import { describe, expect, it, vi } from "vitest";
import {
  CloudflarePagesProductionReleaseProvider,
  toCloudflareProductionReleaseTask,
  type CloudflareProductionTransport,
} from "./production-deployment";
import {
  publishAuthorizedRelease,
  type ReleaseAuthorization,
  type ReleaseCandidate,
} from "./release-gate";

const candidate: ReleaseCandidate = {
  request: {
    id: "req-500",
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
    createdAt: "2026-09-01T23:40:00.000Z",
  },
  previewUrl: "https://preview.example.test/req-500",
  revision: {
    repository: "Teevo6372/moonrock-core",
    branch: "site/reference/req-500",
    commitSha: "abc123",
  },
  executionSummary: "updated hero headline",
  assetIds: ["asset-1"],
};

const authorization: ReleaseAuthorization = {
  requestId: "req-500",
  siteId: "reference",
  revision: candidate.revision,
  previewUrl: candidate.previewUrl,
  source: "policy",
  authorizedBy: "nova-policy",
  authorizedAt: "2026-09-01T23:45:00.000Z",
};

describe("production deployment adapter", () => {
  it("maps an authorized release to an exact-revision Cloudflare production task", () => {
    expect(toCloudflareProductionReleaseTask(candidate, authorization)).toEqual({
      schemaVersion: "1",
      requestId: "req-500",
      siteId: "reference",
      revision: candidate.revision,
      previewUrl: candidate.previewUrl,
      executionSummary: "updated hero headline",
      assetIds: ["asset-1"],
      authorization: {
        source: "policy",
        authorizedBy: "nova-policy",
        authorizedAt: "2026-09-01T23:45:00.000Z",
      },
      constraints: {
        exactRevisionRequired: true,
        productionPublishAllowed: true,
        dnsMutationAllowed: false,
        customDomainMutationAllowed: false,
      },
    });
  });

  it("publishes through the injected production transport only after release authorization", async () => {
    const publish = vi.fn().mockResolvedValue({
      deploymentId: "deployment-500",
      deploymentUrl: "https://www.example.test",
    });
    const transport: CloudflareProductionTransport = { publish };
    const provider = new CloudflarePagesProductionReleaseProvider(transport);

    await expect(publishAuthorizedRelease(candidate, provider, authorization)).resolves.toEqual({
      deploymentId: "deployment-500",
      deploymentUrl: "https://www.example.test",
    });

    expect(publish).toHaveBeenCalledOnce();
    expect(publish).toHaveBeenCalledWith(
      toCloudflareProductionReleaseTask(candidate, authorization),
    );
  });

  it("never invokes the transport when release authorization does not match the reviewed revision", async () => {
    const publish = vi.fn();
    const transport: CloudflareProductionTransport = { publish };
    const provider = new CloudflarePagesProductionReleaseProvider(transport);
    const mismatchedAuthorization: ReleaseAuthorization = {
      ...authorization,
      revision: { ...authorization.revision, commitSha: "different" },
    };

    await expect(
      publishAuthorizedRelease(candidate, provider, mismatchedAuthorization),
    ).resolves.toMatchObject({
      status: "blocked",
      reason: "revision_mismatch",
    });

    expect(publish).not.toHaveBeenCalled();
  });
});
