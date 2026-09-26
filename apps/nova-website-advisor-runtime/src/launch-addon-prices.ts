import { isSellableLaunchAddonId, sellableLaunchAddonItems } from "./ala-carte-catalog.js";

/**
 * Launch add-on Stripe pricing, derived from ALA_CARTE_CATALOG only. Only monthly
 * prices exist: setup fees are waived at Launch checkout. Shared by the
 * provisioning CLI (what to create) and server.ts (what to accept from env).
 */

export interface AddonProvisionItem {
  itemId: string;
  productName: string;
  unitAmountCents: number;
  lookupKey: string;
  productMetadata: Record<string, string>;
  priceMetadata: Record<string, string>;
}

export function addonPriceLookupKey(itemId: string): string {
  return `moonrock_addon_${itemId}_monthly`;
}

/** One entry per currently sellable Launch add-on. Gated items never appear. */
export function buildAddonProvisionPlan(): AddonProvisionItem[] {
  return sellableLaunchAddonItems().map((offer) => ({
    itemId: offer.id,
    productName: `Moonrock Add-On: ${offer.name}`,
    unitAmountCents: offer.monthlyFeeUsd * 100,
    lookupKey: addonPriceLookupKey(offer.id),
    productMetadata: { moonrock_offer_id: offer.id },
    priceMetadata: { moonrock_offer_id: offer.id, moonrock_price_role: "addon_monthly" },
  }));
}

/** De-duplicates ids and keeps only sellable Launch add-ons, preserving first-seen order. */
export function sellableAddonIdsFrom(ids: readonly string[]): string[] {
  return [...new Set(ids)].filter(isSellableLaunchAddonId);
}

export interface ParsedAddonPriceIds {
  priceIds: Record<string, string> | undefined;
  /** Human-readable, never includes price id values. */
  warnings: string[];
}

/**
 * Parses STRIPE_ADDON_MONTHLY_PRICE_IDS ({ "<item_id>": "<price_id>" }). Absent,
 * empty, malformed, or fully-rejected input yields priceIds undefined so
 * checkout behaves exactly as it did before add-ons; it never throws.
 */
export function parseAddonMonthlyPriceIds(raw: string | undefined): ParsedAddonPriceIds {
  const trimmed = raw?.trim();
  if (!trimmed) return { priceIds: undefined, warnings: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { priceIds: undefined, warnings: ["STRIPE_ADDON_MONTHLY_PRICE_IDS is not valid JSON; ignoring it."] };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { priceIds: undefined, warnings: ["STRIPE_ADDON_MONTHLY_PRICE_IDS must be a JSON object of item id to price id; ignoring it."] };
  }
  const priceIds: Record<string, string> = {};
  const warnings: string[] = [];
  for (const [itemId, priceId] of Object.entries(parsed)) {
    if (!isSellableLaunchAddonId(itemId)) {
      warnings.push(`STRIPE_ADDON_MONTHLY_PRICE_IDS: ignoring "${itemId}" (not a known, sellable Launch add-on).`);
    } else if (typeof priceId !== "string" || !priceId.trim().startsWith("price_")) {
      warnings.push(`STRIPE_ADDON_MONTHLY_PRICE_IDS: ignoring "${itemId}" (value is not a Stripe price id).`);
    } else {
      priceIds[itemId] = priceId.trim();
    }
  }
  return { priceIds: Object.keys(priceIds).length > 0 ? priceIds : undefined, warnings };
}

export interface AddonOffer {
  id: string;
  name: string;
  monthlyFeeUsd: number;
  summary: string;
}

/** Sellable Launch add-ons that also have a configured Stripe price, i.e. ones checkout can actually charge for. */
export function purchasableAddonOffers(pricedItemIds: readonly string[]): AddonOffer[] {
  const priced = new Set(pricedItemIds);
  return sellableLaunchAddonItems()
    .filter((offer) => priced.has(offer.id))
    .map((offer) => ({ id: offer.id, name: offer.name, monthlyFeeUsd: offer.monthlyFeeUsd, summary: offer.includedFeatures[0] ?? "" }));
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Which purchasable add-ons a piece of Nova text names. Matches the exact
 * catalog name (Nova is instructed to use exact names), also without a leading
 * "Nova ". Detection is deterministic and never asks the model to record
 * anything; the visitor still has to tick the add-on themselves.
 */
export function suggestedAddonIdsFromText(text: string, pricedItemIds: readonly string[]): string[] {
  return purchasableAddonOffers(pricedItemIds)
    .filter((offer) => [offer.name, offer.name.replace(/^Nova\s+/i, "")].some((alias) => new RegExp(`(^|[^\\w])${escapeRegExp(alias)}($|[^\\w])`, "i").test(text)))
    .map((offer) => offer.id);
}
