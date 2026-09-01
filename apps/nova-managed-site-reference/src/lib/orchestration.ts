import {
  classifySiteChange,
  type AssetRequest,
  type RequestedChange,
  type SiteChangeRequest,
} from "./site-change";

export interface NovaSiteChangeInput {
  id: string;
  siteId: string;
  requestedBy: string;
  customerMessage: string;
  createdAt: string;
}

export interface ParsedSiteChange {
  intent: string;
  requestedChanges: RequestedChange[];
  assetRequests?: AssetRequest[];
}

export interface SiteChangeInterpreter {
  interpret(message: string): Promise<ParsedSiteChange>;
}

export interface SiteChangeExecutionContext {
  assetIds: string[];
}

export interface SiteChangeExecutor {
  execute(
    request: SiteChangeRequest,
    context: SiteChangeExecutionContext,
  ): Promise<{ summary: string }>;
}

export interface AssetProvider {
  createAssets(requests: AssetRequest[], request: SiteChangeRequest): Promise<{ assetIds: string[] }>;
}

export interface PreviewDeploymentProvider {
  createPreview(
    request: SiteChangeRequest,
    execution: { summary: string; assetIds: string[] },
  ): Promise<{ previewUrl: string }>;
}

export type OrchestrationDecision =
  | { status: "needs_clarification"; request: SiteChangeRequest }
  | { status: "operator_review"; request: SiteChangeRequest }
  | { status: "preview_required"; request: SiteChangeRequest }
  | { status: "ready_for_execution"; request: SiteChangeRequest };

export async function createSiteChangeRequest(
  input: NovaSiteChangeInput,
  interpreter: SiteChangeInterpreter,
): Promise<SiteChangeRequest> {
  const parsed = await interpreter.interpret(input.customerMessage);
  const policy = classifySiteChange(input.customerMessage);

  return {
    ...input,
    intent: parsed.intent,
    requestedChanges: parsed.requestedChanges,
    assetRequests: parsed.assetRequests,
    ...policy,
  };
}

export function decideSiteChange(request: SiteChangeRequest): OrchestrationDecision {
  if (request.requestedChanges.length === 0 && !request.assetRequests?.length) {
    return { status: "needs_clarification", request };
  }

  if (request.mode === "operator_review") {
    return { status: "operator_review", request };
  }

  if (request.mode === "preview_required") {
    return { status: "preview_required", request };
  }

  return { status: "ready_for_execution", request };
}
