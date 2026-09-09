import { WEBSITE_BUILD_CATALOG, type WebsiteBuildId } from "./ai-employee-catalog.js";
import { CUMULATIVE_ONE_TIME_REVIEW_THRESHOLD_USD } from "./conversation-sale-tracker.js";
import { diagnoseWebsiteBuild, type DiagnosticInput } from "./diagnostic-engine.js";

export interface WebsiteBuildBrief {
  offerId: WebsiteBuildId;
  offerName: string;
  setupFeeUsd: number;
  scopeDescription: string;
  estimatedDelivery: string;
  businessName: string | null;
  hasExistingWebsite: boolean | null;
  mustHaves: string | null;
  brandAssetsReady: boolean | null;
  recommendationReason: string;
  primaryMotivations: Array<{ id: string; score: number; explanation: string }>;
  assumptionsToConfirm: string[];
  disclosures: string[];
}

export function buildWebsiteBrief(input: DiagnosticInput): WebsiteBuildBrief {
  const diagnosis = diagnoseWebsiteBuild(input);
  const offer = WEBSITE_BUILD_CATALOG[diagnosis.recommendedOfferId];

  const assumptionsToConfirm: string[] = [];
  if (input.websiteScopeNeeded === undefined) assumptionsToConfirm.push("Confirmed page/section scope");
  if (input.websiteMustHaves === undefined) assumptionsToConfirm.push("Any must-have pages, integrations, or features");
  if (input.hasApprovedBrandAssets === undefined) assumptionsToConfirm.push("Whether approved brand assets already exist");

  return {
    offerId: diagnosis.recommendedOfferId,
    offerName: offer.name,
    setupFeeUsd: offer.setupFeeUsd,
    scopeDescription: offer.scopeDescription,
    estimatedDelivery: offer.estimatedDelivery,
    businessName: input.businessName ?? null,
    hasExistingWebsite: input.hasExistingWebsite ?? null,
    mustHaves: input.websiteMustHaves ?? null,
    brandAssetsReady: input.hasApprovedBrandAssets ?? null,
    recommendationReason: diagnosis.recommendationReason,
    primaryMotivations: diagnosis.bottlenecks.slice(0, 3).map((finding) => ({ id: finding.id, score: finding.score, explanation: finding.reason })),
    assumptionsToConfirm,
    disclosures: [
      "This is a preliminary site brief based on the information provided so far. Scope, price, and delivery timing should be confirmed before build work begins.",
      "The setup fee and scope come from Moonrock's Website Build catalog. Nova may select among documented tiers but may not invent or alter commercial terms.",
      "No build has been triggered yet. This brief becomes a build request only after an operator or automated pipeline acts on it.",
    ],
  };
}

// ---------------------------------------------------------------------------
// Structurally compatible with ADR-0005's SiteChangeRequest contract
// (apps/nova-managed-site-reference/src/lib/site-change.ts). Field-for-field
// mirrored locally rather than imported: the two apps are independently
// deployed with no shared workspace/build tooling between them today, so a
// cross-package source import would couple Railway's build to a sibling
// app's source tree. If these apps ever share a real monorepo package, this
// type should be replaced with a direct import of SiteChangeRequest.
// ---------------------------------------------------------------------------

export type WebsiteBuildRequestRisk = "low" | "moderate" | "high";
export type WebsiteBuildRequestMode = "auto" | "preview_required" | "operator_review";

export interface WebsiteBuildRequestedChange {
  target: string;
  operation: "add" | "update" | "remove" | "reorder" | "replace_asset";
  value?: unknown;
}

export interface WebsiteBuildAssetRequest {
  purpose: string;
  description: string;
}

export interface WebsiteBuildRequest {
  id: string;
  siteId: string;
  requestedBy: string;
  customerMessage: string;
  intent: string;
  risk: WebsiteBuildRequestRisk;
  mode: WebsiteBuildRequestMode;
  requestedChanges: WebsiteBuildRequestedChange[];
  assetRequests?: WebsiteBuildAssetRequest[];
  createdAt: string;
}

/**
 * Section 9.8's tier-gated autonomy split: Starter is fully autonomous
 * (unless the negotiated one-time value crosses the review threshold below),
 * Growth gets one lightweight staging checkpoint, Custom always routes to
 * Stephen - "beyond the standard library" is by definition not something a
 * negotiation script can fully scope. Keyed on the Website Build tier
 * actually recommended (brief.offerId), never on hasExistingWebsite - that
 * field describes the visitor's starting point, not which tier's autonomy
 * rules apply, and conflating the two previously let a brand-new custom_site
 * (e.g. an ecommerce build) slip through as risk "low"/mode "auto" even
 * though Custom must always route to Stephen.
 */
function autonomyForWebsiteBuildTier(offerId: WebsiteBuildId, projectedOneTimeValueUsd: number): { risk: WebsiteBuildRequestRisk; mode: WebsiteBuildRequestMode } {
  if (offerId === "custom_site") return { risk: "high", mode: "operator_review" };
  if (offerId === "growth_site") return { risk: "moderate", mode: "preview_required" };
  // starter_site: autonomous only while the running one-time total (this
  // build plus anything else already closed this conversation) stays at or
  // under the threshold - Starter's "starting at $99" is negotiable upward
  // with no fixed ceiling (Section 5.4), so a negotiation that climbs high
  // enough must stop closing autonomously same as it would for Growth.
  if (projectedOneTimeValueUsd > CUMULATIVE_ONE_TIME_REVIEW_THRESHOLD_USD) return { risk: "high", mode: "operator_review" };
  return { risk: "low", mode: "auto" };
}

/**
 * Produces the typed build request without invoking anything. Matches
 * ADR-0005's non-production status: a later approved pipeline decides
 * whether/how to execute this, consistent with that ADR's Claude Code
 * adapter boundary.
 */
export function toWebsiteBuildRequest(
  brief: WebsiteBuildBrief,
  sessionId: string,
  options: { conversationOneTimeValueClosedUsd?: number } = {},
): WebsiteBuildRequest {
  const requestedChanges: WebsiteBuildRequestedChange[] = [
    { target: "site", operation: brief.hasExistingWebsite ? "update" : "add", value: { offerId: brief.offerId, scopeDescription: brief.scopeDescription } },
  ];
  const assetRequests: WebsiteBuildAssetRequest[] = brief.brandAssetsReady === false
    ? [{ purpose: "brand_assets", description: "Visitor does not have approved brand assets yet; Higgsfield asset generation is needed before/alongside the build." }]
    : [];

  const projectedOneTimeValueUsd = (options.conversationOneTimeValueClosedUsd ?? 0) + brief.setupFeeUsd;
  const { risk, mode } = autonomyForWebsiteBuildTier(brief.offerId, projectedOneTimeValueUsd);

  return {
    id: `website-build:${sessionId}`,
    siteId: sessionId,
    requestedBy: "nova",
    customerMessage: brief.mustHaves ?? `${brief.offerName} for ${brief.businessName ?? "the visitor's business"}.`,
    intent: `Build a ${brief.offerName.toLowerCase()} (${brief.offerId}).`,
    risk,
    mode,
    requestedChanges,
    ...(assetRequests.length ? { assetRequests } : {}),
    createdAt: new Date().toISOString(),
  };
}
