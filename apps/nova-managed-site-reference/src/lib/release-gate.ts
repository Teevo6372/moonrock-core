import type { SiteRevision } from "./orchestration";
import type { PreviewWorkflowResult } from "./preview-workflow";
import type { SiteChangeRequest } from "./site-change";

export type ReleaseAuthorizationSource = "policy" | "customer" | "operator";

export interface ReleaseCandidate {
  request: SiteChangeRequest;
  previewUrl: string;
  revision: SiteRevision;
  executionSummary: string;
  assetIds: string[];
}

export interface ReleaseAuthorization {
  requestId: string;
  siteId: string;
  revision: SiteRevision;
  previewUrl: string;
  source: ReleaseAuthorizationSource;
  authorizedBy: string;
  authorizedAt: string;
}

export interface ProductionReleaseResult {
  deploymentId: string;
  deploymentUrl: string;
}

export interface ProductionReleaseProvider {
  publish(
    candidate: ReleaseCandidate,
    authorization: ReleaseAuthorization,
  ): Promise<ProductionReleaseResult>;
}

export type ReleaseBlockReason =
  | "authorization_missing"
  | "request_mismatch"
  | "site_mismatch"
  | "revision_mismatch"
  | "preview_mismatch"
  | "authorization_source_not_allowed";

export type ReleaseDecision =
  | {
      status: "authorized";
      candidate: ReleaseCandidate;
      authorization: ReleaseAuthorization;
    }
  | {
      status: "blocked";
      candidate: ReleaseCandidate;
      reason: ReleaseBlockReason;
    };

export type ReleaseBlockedDecision = Extract<ReleaseDecision, { status: "blocked" }>;

export function isReleaseBlockedDecision(
  result: ProductionReleaseResult | ReleaseBlockedDecision,
): result is ReleaseBlockedDecision {
  return "status" in result && result.status === "blocked";
}

export function toReleaseCandidate(result: PreviewWorkflowResult): ReleaseCandidate | null {
  if (result.status !== "preview_ready") {
    return null;
  }

  return {
    request: result.request,
    previewUrl: result.previewUrl,
    revision: result.revision,
    executionSummary: result.executionSummary,
    assetIds: result.assetIds,
  };
}

function sameRevision(left: SiteRevision, right: SiteRevision): boolean {
  return (
    left.repository === right.repository &&
    left.branch === right.branch &&
    left.commitSha === right.commitSha
  );
}

function sourceAllowed(candidate: ReleaseCandidate, source: ReleaseAuthorizationSource): boolean {
  if (candidate.request.mode === "operator_review") {
    return source === "operator";
  }

  if (candidate.request.mode === "preview_required") {
    return source === "customer" || source === "operator";
  }

  return source === "policy" || source === "customer" || source === "operator";
}

export function decideProductionRelease(
  candidate: ReleaseCandidate,
  authorization?: ReleaseAuthorization,
): ReleaseDecision {
  if (!authorization) {
    return { status: "blocked", candidate, reason: "authorization_missing" };
  }

  if (authorization.requestId !== candidate.request.id) {
    return { status: "blocked", candidate, reason: "request_mismatch" };
  }

  if (authorization.siteId !== candidate.request.siteId) {
    return { status: "blocked", candidate, reason: "site_mismatch" };
  }

  if (!sameRevision(authorization.revision, candidate.revision)) {
    return { status: "blocked", candidate, reason: "revision_mismatch" };
  }

  if (authorization.previewUrl !== candidate.previewUrl) {
    return { status: "blocked", candidate, reason: "preview_mismatch" };
  }

  if (!sourceAllowed(candidate, authorization.source)) {
    return { status: "blocked", candidate, reason: "authorization_source_not_allowed" };
  }

  return { status: "authorized", candidate, authorization };
}

export async function publishAuthorizedRelease(
  candidate: ReleaseCandidate,
  provider: ProductionReleaseProvider,
  authorization?: ReleaseAuthorization,
): Promise<ProductionReleaseResult | ReleaseBlockedDecision> {
  const decision = decideProductionRelease(candidate, authorization);

  if (decision.status === "blocked") {
    return decision;
  }

  return provider.publish(candidate, decision.authorization);
}
