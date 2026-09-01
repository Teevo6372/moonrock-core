import { describe, expect, it, vi } from "vitest";
import {
  CloudflarePagesPreviewDeploymentProvider,
  toCloudflarePreviewTask,
  type CloudflarePreviewTransport,
} from "./preview-deployment";
import type { SiteChangeExecutionResult } from "./orchestration";
import type { SiteChangeRequest } from "./site-change";

const request: SiteChangeRequest = {
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
};

const execution: SiteChangeExecutionResult & { assetIds: string[] } = {
  summary: "updated hero",
  revision: {
    repository: "Teevo6372/moonrock-core",
    branch: "nova/change-req-400",
    commitSha: "fedcba987654",
  },
  assetIds: ["asset-1"],
};

describe("Cloudflare preview deployment adapter", () => {
  it("maps a committed revision to a preview-only Cloudflare task", () => {
    expect(toCloudflarePreviewTask(request, execution)).toEqual({
      schemaVersion: "1",
      requestId: "req-400",
      siteId: "reference",
      revision: execution.revision,
      executionSummary: "updated hero",
      assetIds: ["asset-1"],
      constraints: {
        previewOnly: true,
        productionBranchAllowed: false,
      },
    });
  });

  it("returns only the preview URL through the deployment-provider contract", async () => {
    const createPreview = vi.fn().mockResolvedValue({
      previewUrl: "https://req-400.preview.pages.dev",
      deploymentId: "deployment-400",
    });
    const transport: CloudflarePreviewTransport = { createPreview };
    const provider = new CloudflarePagesPreviewDeploymentProvider(transport);

    await expect(provider.createPreview(request, execution)).resolves.toEqual({
      previewUrl: "https://req-400.preview.pages.dev",
    });
    expect(createPreview).toHaveBeenCalledOnce();
    expect(createPreview).toHaveBeenCalledWith(toCloudflarePreviewTask(request, execution));
  });
});
