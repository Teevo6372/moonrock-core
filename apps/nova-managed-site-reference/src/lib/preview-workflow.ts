import {
  decideSiteChange,
  type AssetProvider,
  type PreviewDeploymentProvider,
  type SiteChangeExecutor,
} from "./orchestration";
import type { SiteChangeRequest } from "./site-change";

export interface PreviewWorkflowDependencies {
  assetProvider: AssetProvider;
  executor: SiteChangeExecutor;
  previewDeployment: PreviewDeploymentProvider;
}

export type PreviewWorkflowResult =
  | {
      status: "needs_clarification" | "operator_review";
      request: SiteChangeRequest;
    }
  | {
      status: "preview_ready";
      request: SiteChangeRequest;
      previewUrl: string;
      executionSummary: string;
      assetIds: string[];
      customerApprovalRequired: boolean;
    };

export async function runPreviewWorkflow(
  request: SiteChangeRequest,
  dependencies: PreviewWorkflowDependencies,
): Promise<PreviewWorkflowResult> {
  const decision = decideSiteChange(request);

  if (decision.status === "needs_clarification" || decision.status === "operator_review") {
    return { status: decision.status, request };
  }

  const assetIds = request.assetRequests?.length
    ? (await dependencies.assetProvider.createAssets(request.assetRequests, request)).assetIds
    : [];

  const execution = await dependencies.executor.execute(request, { assetIds });
  const preview = await dependencies.previewDeployment.createPreview(request, {
    summary: execution.summary,
    assetIds,
  });

  return {
    status: "preview_ready",
    request,
    previewUrl: preview.previewUrl,
    executionSummary: execution.summary,
    assetIds,
    customerApprovalRequired: decision.status === "preview_required",
  };
}
