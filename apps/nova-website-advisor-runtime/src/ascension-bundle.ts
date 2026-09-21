import type { ServiceTier } from "./ai-employee-catalog.js";
import { ALA_CARTE_CATALOG, type AlaCarteItemId } from "./ala-carte-catalog.js";
import type { DiagnosticInput } from "./diagnostic-engine.js";

// ---------------------------------------------------------------------------
// Launch add-on bundles
// Each bundle stores exactly one price (bundleMonthlyFeeUsd). The separate
// total and savings figures are always computed from ALA_CARTE_CATALOG so
// they can never drift from catalog prices.
// Setup fees for member items are waived when a bundle is purchased at Launch
// checkout (setupFeesWaivedAtLaunchCheckout: true).
// A bundle is only sellable when every member item is also sellable — gated
// items make any bundle containing them unsellable automatically.
// ---------------------------------------------------------------------------

export type LaunchAddonBundleId =
  | "reputation_pack"
  | "get_found_pack"
  | "keep_customers_pack"
  | "full_autopilot";

export interface LaunchAddonBundle {
  id: LaunchAddonBundleId;
  name: string;
  /** Catalog item IDs that make up this bundle. Must match AlaCarteItemId. */
  itemIds: readonly AlaCarteItemId[];
  /** The single stored bundle price. Totals and savings are derived, never stored. */
  bundleMonthlyFeeUsd: number;
  /** True: individual member setup fees are waived when purchased at Launch checkout. */
  setupFeesWaivedAtLaunchCheckout: boolean;
}

export const LAUNCH_ADDON_BUNDLES: Readonly<Record<LaunchAddonBundleId, LaunchAddonBundle>> = {
  reputation_pack: {
    id: "reputation_pack",
    name: "Reputation Pack",
    itemIds: ["review_response_autopilot", "referral_engine", "monthly_scorecard"],
    bundleMonthlyFeeUsd: 59,
    setupFeesWaivedAtLaunchCheckout: true,
  },
  get_found_pack: {
    id: "get_found_pack",
    name: "Get Found Pack",
    itemIds: ["gbp_autopilot", "social_content_autopilot", "local_seo_page_pack"],
    bundleMonthlyFeeUsd: 119,
    setupFeesWaivedAtLaunchCheckout: true,
  },
  keep_customers_pack: {
    id: "keep_customers_pack",
    name: "Keep-Customers Pack",
    itemIds: ["quote_followup_sequences", "reactivation_newsletter", "seasonal_campaign_automation"],
    bundleMonthlyFeeUsd: 119,
    setupFeesWaivedAtLaunchCheckout: true,
  },
  full_autopilot: {
    id: "full_autopilot",
    name: "Full Autopilot",
    itemIds: [
      "review_response_autopilot",
      "referral_engine",
      "monthly_scorecard",
      "gbp_autopilot",
      "social_content_autopilot",
      "local_seo_page_pack",
      "quote_followup_sequences",
      "reactivation_newsletter",
      "seasonal_campaign_automation",
      "website_care_plan",
    ],
    bundleMonthlyFeeUsd: 249,
    setupFeesWaivedAtLaunchCheckout: true,
  },
};

/** Sum of each member item's catalog monthly fee — the "if bought separately" figure. */
export function computeBundleSeparateMonthlyTotal(bundle: LaunchAddonBundle): number {
  return bundle.itemIds.reduce((sum, id) => sum + ALA_CARTE_CATALOG[id].monthlyFeeUsd, 0);
}

/** Monthly savings vs. buying each item separately. */
export function computeBundleMonthlySavings(bundle: LaunchAddonBundle): number {
  return computeBundleSeparateMonthlyTotal(bundle) - bundle.bundleMonthlyFeeUsd;
}

/**
 * A bundle is only sellable when every member item is also sellable.
 * Gated items (sellable: false) automatically make any bundle containing them
 * unsellable until the gate is lifted.
 */
export function isBundleSellable(bundle: LaunchAddonBundle): boolean {
  return bundle.itemIds.every((id) => ALA_CARTE_CATALOG[id].sellable);
}

/** Returns only bundles where every member item is currently sellable. */
export function sellableLaunchAddonBundles(): LaunchAddonBundle[] {
  return Object.values(LAUNCH_ADDON_BUNDLES).filter(isBundleSellable);
}

export interface BundleLineItem {
  itemId: string;
  itemName: string;
  source: "requested" | "auto_attached_crm" | "cross_tier_suggestion";
  setupFeeUsd: number;
  monthlyFeeUsd: number;
  reason: string;
}

export interface AscensionBundle {
  lineItems: BundleLineItem[];
  /** Straight sum of every line item's own catalog price - no bundle discount. */
  blendedSetupFeeUsd: number;
  blendedMonthlyFeeUsd: number;
  crmAutoAttached: boolean;
  alternatives: Array<{ description: string; setupFeeUsd: number; monthlyFeeUsd: number }>;
  bundleReason: string;
}

const CRM_REQUIRED_ITEMS = new Set<AlaCarteItemId>(
  Object.values(ALA_CARTE_CATALOG).filter((offer) => offer.requiresCrm).map((offer) => offer.id),
);

/** Single source of truth for the Always-Bundle CRM rule. */
export function requiresCrmAttachment(itemIds: readonly AlaCarteItemId[]): boolean {
  return itemIds.some((id) => CRM_REQUIRED_ITEMS.has(id));
}

function sumFee(lineItems: readonly BundleLineItem[], key: "setupFeeUsd" | "monthlyFeeUsd"): number {
  return lineItems.reduce((total, item) => total + item[key], 0);
}

function alaCarteLineItem(id: AlaCarteItemId, source: BundleLineItem["source"], reason: string): BundleLineItem {
  const offer = ALA_CARTE_CATALOG[id];
  return { itemId: offer.id, itemName: offer.name, source, setupFeeUsd: offer.setupFeeUsd, monthlyFeeUsd: offer.monthlyFeeUsd, reason };
}

function standaloneAlternatives(lineItems: readonly BundleLineItem[]): AscensionBundle["alternatives"] {
  if (lineItems.length <= 1) return [];
  return lineItems.map((item) => ({ description: `Just ${item.itemName}, without the rest of the bundle`, setupFeeUsd: item.setupFeeUsd, monthlyFeeUsd: item.monthlyFeeUsd }));
}

/**
 * Composes a bundle from explicitly requested a-la-carte items, applying the
 * Always-Bundle CRM rule. Every price comes straight from ALA_CARTE_CATALOG -
 * never invented, never discounted (straight sum, per the resolved pricing
 * decision).
 */
export function composeAlaCarteBundle(requestedItemIds: readonly AlaCarteItemId[], options: { hasExistingCrm?: boolean } = {}): AscensionBundle {
  const lineItems: BundleLineItem[] = requestedItemIds.map((id) => alaCarteLineItem(id, "requested", "Explicitly requested by the visitor."));
  const crmAlreadyRequested = requestedItemIds.includes("crm_pipeline");
  const crmAutoAttached = !options.hasExistingCrm && !crmAlreadyRequested && requiresCrmAttachment(requestedItemIds);
  if (crmAutoAttached) {
    lineItems.push(alaCarteLineItem("crm_pipeline", "auto_attached_crm", "One or more requested items capture, log, or route customer interactions and need CRM & Pipeline Management underneath them."));
  }
  return {
    lineItems,
    blendedSetupFeeUsd: sumFee(lineItems, "setupFeeUsd"),
    blendedMonthlyFeeUsd: sumFee(lineItems, "monthlyFeeUsd"),
    crmAutoAttached,
    alternatives: standaloneAlternatives(lineItems),
    bundleReason: lineItems.length > 1
      ? "Bundled so every requested capability works together out of the gate."
      : "A single item, priced at Moonrock's published catalog rate.",
  };
}

/**
 * Nested mini-ascension for "Reason Through Resistance": drop one or more
 * line items and recompose. Reuses composeAlaCarteBundle - no separate
 * pricing logic, so a downsell can never drift from the catalog.
 */
export function downsellBundle(bundle: AscensionBundle, droppedItemIds: readonly string[], options: { hasExistingCrm?: boolean } = {}): AscensionBundle {
  const remainingRequested = bundle.lineItems
    .filter((item) => item.source === "requested" && !droppedItemIds.includes(item.itemId))
    .map((item) => item.itemId as AlaCarteItemId);
  return composeAlaCarteBundle(remainingRequested, options);
}

const QUOTE_FORM_SIGNAL = /quote form|contact form|lead form|booking form/i;
const EXPLICIT_FORMS_SIGNAL = /\bforms?\b/i;

/**
 * Cross-tier enrichment: given a primary-tier diagnosis, detects known
 * attachment patterns (e.g. a website build with a quote/contact form
 * implies CRM routing for the leads it captures) and returns a bundle
 * alongside - never replaces the primary tier's own recommendedOfferId.
 */
export function composeCrossTierBundle(
  primaryTier: ServiceTier,
  input: DiagnosticInput,
  requestedAlaCarteItemIds: readonly AlaCarteItemId[] = [],
): AscensionBundle | undefined {
  if (primaryTier === "website_build") {
    const text = `${input.websiteMustHaves ?? ""} ${input.businessChallenges ?? ""}`;
    if (!QUOTE_FORM_SIGNAL.test(text)) return undefined;
    const suggestedIds: AlaCarteItemId[] = ["crm_pipeline"];
    if (EXPLICIT_FORMS_SIGNAL.test(text)) suggestedIds.push("surveys_forms");
    const lineItems = suggestedIds.map((id) => alaCarteLineItem(id, "cross_tier_suggestion", "A quote/contact form needs somewhere to route and follow up on the leads it captures."));
    return {
      lineItems,
      blendedSetupFeeUsd: sumFee(lineItems, "setupFeeUsd"),
      blendedMonthlyFeeUsd: sumFee(lineItems, "monthlyFeeUsd"),
      crmAutoAttached: true,
      alternatives: standaloneAlternatives(lineItems),
      bundleReason: "The site's quote/contact form needs a place to route and follow up on the leads it captures.",
    };
  }
  if (primaryTier === "ala_carte" && requestedAlaCarteItemIds.length > 0) {
    return composeAlaCarteBundle(requestedAlaCarteItemIds, input.hasExistingCrm !== undefined ? { hasExistingCrm: input.hasExistingCrm } : {});
  }
  return undefined;
}
