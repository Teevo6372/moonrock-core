import { describe, expect, it, vi } from "vitest";
import type { PreviewWorkflowResult } from "./preview-workflow";
import {
  decideProductionRelease,
  publishAuthorizedRelease,
  toReleaseCandidate,
  type ProductionReleaseProvider,
  type ReleaseAuthorization,
} from "./release-gate";

const preview: Extract<PreviewWorkflowResult, { status: "preview_ready" }> = {
  status: "preview_ready",
  request: {
    id: "req-400",
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
  previewUrl: "https://preview.example.test/req-400",
  revision: {
    repository: "Teevo6372/customer-site",
    branch: "nova/req-400",
    commitSha: "abc123",
  },
  executionSummary: "updated hero",
  assetIds: [],
  customerApprovalRequired: false,
};

function authorization(
  overrides: Partial<ReleaseAuthorization> = {},
): ReleaseAuthorization {
  return {
    requestId: preview.request.id,
    siteId: preview.request.siteId,
    revision: preview.revision,
    previewUrl: preview.previewUrl,
    source: "policy",
    authorizedBy: "nova-release-policy-v1",
    authorizedAt: "2026-09-01T23:41:00.000Z",
    ...overrides,
  };
}

describe("production release authorization gate", () => {
  it("creates a release candidate only from a ready preview", () => {
    expect(toReleaseCandidate(preview)).toEqual({
      request: preview.request,
      previewUrl: preview.previewUrl,
      revision: preview.revision,
      executionSummary: preview.executionSummary,
      assetIds: [],
    });

    expect(
      toReleaseCandidate({ status: "operator_review", request: preview.request }),
    ).toBeNull();
  });

  it("allows policy authorization for bounded low-risk automatic changes", () => {
    const candidate = toReleaseCandidate(preview);
    expect(candidate).not.toBeNull();
    if (!candidate) return;

    expect(decideProductionRelease(candidate, authorization()).status).toBe("authorized");
  });

  it("requires customer or operator authorization for preview-required changes", () => {
    const candidate = toReleaseCandidate({
      ...preview,
      request: {
        ...preview.request,
        risk: "moderate",
        mode: "preview_required",
      },
      customerApprovalRequired: true,
    });
    expect(candidate).not.toBeNull();
    if (!candidate) return;

    expect(decideProductionRelease(candidate, authorization()).status).toBe("blocked");
    expect(
      decideProductionRelease(candidate, authorization({ source: "customer", authorizedBy: "customer-1" })).status,
    ).toBe("authorized");
  });

  it("blocks authorization when the committed revision does not exactly match the reviewed preview", () => {
    const candidate = toReleaseCandidate(preview);
    expect(candidate).not.toBeNull();
    if (!candidate) return;

    expect(
      decideProductionRelease(
        candidate,
        authorization({ revision: { ...preview.revision, commitSha: "different-sha" } }),
      ),
    ).toMatchObject({ status: "blocked", reason: "revision_mismatch" });
  });

  it("never calls the production provider without a valid authorization", async () => {
    const candidate = toReleaseCandidate(preview);
    expect(candidate).not.toBeNull();
    if (!candidate) return;

    const publish = vi.fn().mockResolvedValue({
      deploymentId: "prod-1",
      deploymentUrl: "https://example.test",
    });
    const provider: ProductionReleaseProvider = { publish };

    await expect(publishAuthorizedRelease(candidate, provider)).resolves.toMatchObject({
      status: "blocked",
      reason: "authorization_missing",
    });
    expect(publish).not.toHaveBeenCalled();
  });

  it("publishes only the exact authorized candidate", async () => {
    const candidate = toReleaseCandidate(preview);
    expect(candidate).not.toBeNull();
    if (!candidate) return;

    const auth = authorization();
    const publish = vi.fn().mockResolvedValue({
      deploymentId: "prod-1",
      deploymentUrl: "https://example.test",
    });
    const provider: ProductionReleaseProvider = { publish };

    await expect(publishAuthorizedRelease(candidate, provider, auth)).resolves.toEqual({
      deploymentId: "prod-1",
      deploymentUrl: "https://example.test",
    });
    expect(publish).toHaveBeenCalledOnce();
    expect(publish).toHaveBeenCalledWith(candidate, auth);
  });
});
