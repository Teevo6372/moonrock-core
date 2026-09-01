import { describe, expect, it, vi } from "vitest";
import {
  ClaudeCodeSiteChangeExecutor,
  HiggsfieldAssetProvider,
  toClaudeCodeChangeTask,
  toHiggsfieldAssetTask,
  type ClaudeCodeTransport,
  type HiggsfieldTransport,
} from "./provider-adapters";
import type { SiteChangeRequest } from "./site-change";

const request: SiteChangeRequest = {
  id: "req-200",
  siteId: "reference",
  requestedBy: "customer",
  customerMessage: "Update the hero headline and create a premium background image",
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
  assetRequests: [
    {
      purpose: "homepage hero",
      description: "premium futuristic space background",
    },
  ],
  createdAt: "2026-09-01T23:20:00.000Z",
};

describe("provider adapter contracts", () => {
  it("maps the canonical request to a bounded Claude Code task", () => {
    expect(toClaudeCodeChangeTask(request)).toEqual({
      schemaVersion: "1",
      requestId: "req-200",
      siteId: "reference",
      intent: "update_hero",
      requestedChanges: request.requestedChanges,
      constraints: {
        repositoryIsSourceOfTruth: true,
        requireValidation: true,
        allowProductionDeploy: false,
      },
    });
  });

  it("maps requested assets to a bounded Higgsfield task", () => {
    expect(toHiggsfieldAssetTask(request.assetRequests ?? [], request)).toEqual({
      schemaVersion: "1",
      requestId: "req-200",
      siteId: "reference",
      assets: request.assetRequests,
      constraints: {
        returnReusableAssets: true,
        allowProductionPublish: false,
      },
    });
  });

  it("executes through an injected Claude Code transport", async () => {
    const execute = vi.fn().mockResolvedValue({ summary: "updated hero" });
    const transport: ClaudeCodeTransport = { execute };
    const executor = new ClaudeCodeSiteChangeExecutor(transport);

    await expect(executor.execute(request)).resolves.toEqual({ summary: "updated hero" });
    expect(execute).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledWith(toClaudeCodeChangeTask(request));
  });

  it("creates assets through an injected Higgsfield transport", async () => {
    const generate = vi.fn().mockResolvedValue({ assetIds: ["asset-1"] });
    const transport: HiggsfieldTransport = { generate };
    const provider = new HiggsfieldAssetProvider(transport);
    const assets = request.assetRequests ?? [];

    await expect(provider.createAssets(assets, request)).resolves.toEqual({ assetIds: ["asset-1"] });
    expect(generate).toHaveBeenCalledOnce();
    expect(generate).toHaveBeenCalledWith(toHiggsfieldAssetTask(assets, request));
  });
});
