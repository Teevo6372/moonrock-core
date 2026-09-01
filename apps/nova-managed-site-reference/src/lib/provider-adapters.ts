import type {
  AssetProvider,
  SiteChangeExecutionContext,
  SiteChangeExecutor,
} from "./orchestration";
import type {
  AssetRequest,
  RequestedChange,
  SiteChangeRequest,
} from "./site-change";

export interface ClaudeCodeChangeTask {
  schemaVersion: "1";
  requestId: string;
  siteId: string;
  intent: string;
  requestedChanges: RequestedChange[];
  assetIds: string[];
  constraints: {
    repositoryIsSourceOfTruth: true;
    requireValidation: true;
    allowProductionDeploy: false;
  };
}

export interface ClaudeCodeChangeResult {
  summary: string;
}

export interface ClaudeCodeTransport {
  execute(task: ClaudeCodeChangeTask): Promise<ClaudeCodeChangeResult>;
}

export interface HiggsfieldAssetTask {
  schemaVersion: "1";
  requestId: string;
  siteId: string;
  assets: AssetRequest[];
  constraints: {
    returnReusableAssets: true;
    allowProductionPublish: false;
  };
}

export interface HiggsfieldAssetResult {
  assetIds: string[];
}

export interface HiggsfieldTransport {
  generate(task: HiggsfieldAssetTask): Promise<HiggsfieldAssetResult>;
}

export function toClaudeCodeChangeTask(
  request: SiteChangeRequest,
  context: SiteChangeExecutionContext,
): ClaudeCodeChangeTask {
  return {
    schemaVersion: "1",
    requestId: request.id,
    siteId: request.siteId,
    intent: request.intent,
    requestedChanges: request.requestedChanges,
    assetIds: context.assetIds,
    constraints: {
      repositoryIsSourceOfTruth: true,
      requireValidation: true,
      allowProductionDeploy: false,
    },
  };
}

export function toHiggsfieldAssetTask(
  requests: AssetRequest[],
  request: SiteChangeRequest,
): HiggsfieldAssetTask {
  return {
    schemaVersion: "1",
    requestId: request.id,
    siteId: request.siteId,
    assets: requests,
    constraints: {
      returnReusableAssets: true,
      allowProductionPublish: false,
    },
  };
}

export class ClaudeCodeSiteChangeExecutor implements SiteChangeExecutor {
  constructor(private readonly transport: ClaudeCodeTransport) {}

  async execute(
    request: SiteChangeRequest,
    context: SiteChangeExecutionContext,
  ): Promise<{ summary: string }> {
    return this.transport.execute(toClaudeCodeChangeTask(request, context));
  }
}

export class HiggsfieldAssetProvider implements AssetProvider {
  constructor(private readonly transport: HiggsfieldTransport) {}

  async createAssets(
    requests: AssetRequest[],
    request: SiteChangeRequest,
  ): Promise<{ assetIds: string[] }> {
    return this.transport.generate(toHiggsfieldAssetTask(requests, request));
  }
}
