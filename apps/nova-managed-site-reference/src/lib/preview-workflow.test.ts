import { describe, expect, it, vi } from "vitest";
import type {
  AssetProvider,
  PreviewDeploymentProvider,
  SiteChangeExecutor,
} from "./orchestration";
import { runPreviewWorkflow } from "./preview-workflow";
import type { SiteChangeRequest } from "./site-change";

function request(overrides: Partial<SiteChangeRequest> = {}): SiteChangeRequest {
  return {
    id: "req-300",
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
    createdAt: "2026-09-01T23:30:00.000Z",
    ...overrides,
  };
}

function dependencies() {
  const createAssets = vi.fn().mockResolvedValue({ assetIds: ["asset-1"] });
  const execute = vi.fn().mockResolvedValue({ summary: "updated site" });
  const createPreview = vi.fn().mockResolvedValue({ previewUrl: "https://preview.example.test/req-300" });

  const assetProvider: AssetProvider = { createAssets };
  const executor: SiteChangeExecutor = { execute };
  const previewDeployment: PreviewDeploymentProvider = { createPreview };

  return {
    assetProvider,
    executor,
    previewDeployment,
    createAssets,
    execute,
    createPreview,
  };
}

describe("non-production preview workflow", () => {
  it("creates assets, executes the change, and produces a preview", async () => {
    const deps = dependencies();
    const siteRequest = request({
      assetRequests: [
        {
          purpose: "homepage hero",
          description: "premium futuristic space background",
        },
      ],
    });

    await expect(runPreviewWorkflow(siteRequest, deps)).resolves.toEqual({
      status: "preview_ready",
      request: siteRequest,
      previewUrl: "https://preview.example.test/req-300",
      executionSummary: "updated site",
      assetIds: ["asset-1"],
      customerApprovalRequired: false,
    });

    expect(deps.createAssets).toHaveBeenCalledOnce();
    expect(deps.execute).toHaveBeenCalledWith(siteRequest, { assetIds: ["asset-1"] });
    expect(deps.createPreview).toHaveBeenCalledWith(siteRequest, {
      summary: "updated site",
      assetIds: ["asset-1"],
    });
  });

  it("marks structural changes as requiring customer approval", async () => {
    const deps = dependencies();
    const siteRequest = request({
      customerMessage: "Redesign the homepage layout",
      risk: "moderate",
      mode: "preview_required",
    });

    const result = await runPreviewWorkflow(siteRequest, deps);

    expect(result.status).toBe("preview_ready");
    if (result.status === "preview_ready") {
      expect(result.customerApprovalRequired).toBe(true);
    }
  });

  it("does not call providers for operator-review requests", async () => {
    const deps = dependencies();
    const siteRequest = request({
      customerMessage: "Change the payment account",
      risk: "high",
      mode: "operator_review",
    });

    await expect(runPreviewWorkflow(siteRequest, deps)).resolves.toEqual({
      status: "operator_review",
      request: siteRequest,
    });

    expect(deps.createAssets).not.toHaveBeenCalled();
    expect(deps.execute).not.toHaveBeenCalled();
    expect(deps.createPreview).not.toHaveBeenCalled();
  });

  it("does not call providers when the request needs clarification", async () => {
    const deps = dependencies();
    const siteRequest = request({
      customerMessage: "Make it better",
      requestedChanges: [],
    });

    await expect(runPreviewWorkflow(siteRequest, deps)).resolves.toEqual({
      status: "needs_clarification",
      request: siteRequest,
    });

    expect(deps.createAssets).not.toHaveBeenCalled();
    expect(deps.execute).not.toHaveBeenCalled();
    expect(deps.createPreview).not.toHaveBeenCalled();
  });
});
