import type {
  PreviewDeploymentProvider,
  SiteChangeExecutionResult,
  SiteRevision,
} from "./orchestration";
import type { SiteChangeRequest } from "./site-change";

export interface CloudflarePreviewTask {
  schemaVersion: "1";
  requestId: string;
  siteId: string;
  revision: SiteRevision;
  executionSummary: string;
  assetIds: string[];
  constraints: {
    previewOnly: true;
    productionBranchAllowed: false;
  };
}

export interface CloudflarePreviewResult {
  previewUrl: string;
  deploymentId: string;
}

export interface CloudflarePreviewTransport {
  createPreview(task: CloudflarePreviewTask): Promise<CloudflarePreviewResult>;
}

export function toCloudflarePreviewTask(
  request: SiteChangeRequest,
  execution: SiteChangeExecutionResult & { assetIds: string[] },
): CloudflarePreviewTask {
  return {
    schemaVersion: "1",
    requestId: request.id,
    siteId: request.siteId,
    revision: execution.revision,
    executionSummary: execution.summary,
    assetIds: execution.assetIds,
    constraints: {
      previewOnly: true,
      productionBranchAllowed: false,
    },
  };
}

export class CloudflarePagesPreviewDeploymentProvider implements PreviewDeploymentProvider {
  constructor(private readonly transport: CloudflarePreviewTransport) {}

  async createPreview(
    request: SiteChangeRequest,
    execution: SiteChangeExecutionResult & { assetIds: string[] },
  ): Promise<{ previewUrl: string }> {
    const result = await this.transport.createPreview(toCloudflarePreviewTask(request, execution));
    return { previewUrl: result.previewUrl };
  }
}
