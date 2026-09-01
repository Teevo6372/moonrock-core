import type {
  ProductionReleaseProvider,
  ProductionReleaseResult,
  ReleaseAuthorization,
  ReleaseCandidate,
} from "./release-gate";

export interface CloudflareProductionReleaseTask {
  schemaVersion: "1";
  requestId: string;
  siteId: string;
  revision: ReleaseCandidate["revision"];
  previewUrl: string;
  executionSummary: string;
  assetIds: string[];
  authorization: {
    source: ReleaseAuthorization["source"];
    authorizedBy: string;
    authorizedAt: string;
  };
  constraints: {
    exactRevisionRequired: true;
    productionPublishAllowed: true;
    dnsMutationAllowed: false;
    customDomainMutationAllowed: false;
  };
}

export interface CloudflareProductionReleaseResult {
  deploymentId: string;
  deploymentUrl: string;
}

export interface CloudflareProductionTransport {
  publish(task: CloudflareProductionReleaseTask): Promise<CloudflareProductionReleaseResult>;
}

export function toCloudflareProductionReleaseTask(
  candidate: ReleaseCandidate,
  authorization: ReleaseAuthorization,
): CloudflareProductionReleaseTask {
  return {
    schemaVersion: "1",
    requestId: candidate.request.id,
    siteId: candidate.request.siteId,
    revision: candidate.revision,
    previewUrl: candidate.previewUrl,
    executionSummary: candidate.executionSummary,
    assetIds: candidate.assetIds,
    authorization: {
      source: authorization.source,
      authorizedBy: authorization.authorizedBy,
      authorizedAt: authorization.authorizedAt,
    },
    constraints: {
      exactRevisionRequired: true,
      productionPublishAllowed: true,
      dnsMutationAllowed: false,
      customDomainMutationAllowed: false,
    },
  };
}

export class CloudflarePagesProductionReleaseProvider implements ProductionReleaseProvider {
  constructor(private readonly transport: CloudflareProductionTransport) {}

  async publish(
    candidate: ReleaseCandidate,
    authorization: ReleaseAuthorization,
  ): Promise<ProductionReleaseResult> {
    return this.transport.publish(toCloudflareProductionReleaseTask(candidate, authorization));
  }
}
