export type SiteChangeRisk = "low" | "moderate" | "high";
export type SiteChangeMode = "auto" | "preview_required" | "operator_review";
export type SiteChangeOperation = "add" | "update" | "remove" | "reorder" | "replace_asset";

export interface RequestedChange {
  target: string;
  operation: SiteChangeOperation;
  value?: unknown;
}

export interface AssetRequest {
  purpose: string;
  description: string;
}

export interface SiteChangeRequest {
  id: string;
  siteId: string;
  requestedBy: string;
  customerMessage: string;
  intent: string;
  risk: SiteChangeRisk;
  mode: SiteChangeMode;
  requestedChanges: RequestedChange[];
  assetRequests?: AssetRequest[];
  createdAt: string;
}

const highRiskTerms = [
  "dns",
  "domain transfer",
  "payment account",
  "stripe",
  "bank account",
  "password",
  "authentication",
  "privacy policy",
  "terms of service",
  "delete site",
  "delete everything",
];

const moderateRiskTerms = [
  "redesign",
  "navigation",
  "new page",
  "homepage layout",
  "move section",
  "reorder section",
  "conversion flow",
];

export function classifySiteChange(message: string): Pick<SiteChangeRequest, "risk" | "mode"> {
  const normalized = message.toLowerCase();

  if (highRiskTerms.some((term) => normalized.includes(term))) {
    return { risk: "high", mode: "operator_review" };
  }

  if (moderateRiskTerms.some((term) => normalized.includes(term))) {
    return { risk: "moderate", mode: "preview_required" };
  }

  return { risk: "low", mode: "auto" };
}

export function canDeployAutomatically(request: SiteChangeRequest): boolean {
  return request.risk === "low" && request.mode === "auto" && request.requestedChanges.length > 0;
}
