import { buildAddonProvisionPlan } from "./launch-addon-prices.js";
import type { StripeClient } from "./stripe-client.js";

export type AddonProvisionAction = "create" | "exists";

export interface AddonProvisionOutcome {
  itemId: string;
  lookupKey: string;
  unitAmountCents: number;
  action: AddonProvisionAction;
  /** Present when the price already exists, or after a create in apply mode. */
  priceId?: string;
}

type ProvisionClient = Pick<StripeClient, "listPricesByLookupKeys" | "createPrice">;

/**
 * Plans (and with apply=true, performs) creation of one monthly Price per
 * sellable Launch add-on. Safe to re-run: an item whose lookup key already
 * exists is skipped, and a conflicting existing price (archived, or different
 * amount/interval/currency) aborts before anything is created. Only touches
 * Launch add-on items - it never creates Launch Plan objects.
 */
export async function provisionLaunchAddonPrices(client: ProvisionClient, apply: boolean): Promise<AddonProvisionOutcome[]> {
  const plan = buildAddonProvisionPlan();
  const existing = await client.listPricesByLookupKeys(plan.map((item) => item.lookupKey));
  const byKey = new Map(existing.filter((price) => price.lookup_key).map((price) => [price.lookup_key as string, price]));

  const outcomes: AddonProvisionOutcome[] = [];
  for (const item of plan) {
    const found = byKey.get(item.lookupKey);
    if (!found) {
      outcomes.push({ itemId: item.itemId, lookupKey: item.lookupKey, unitAmountCents: item.unitAmountCents, action: "create" });
      continue;
    }
    if (!found.active || found.unit_amount !== item.unitAmountCents || found.currency !== "usd" || found.recurring?.interval !== "month") {
      throw new Error(`Existing Stripe price ${found.id} for lookup key ${item.lookupKey} does not match the catalog (inactive, or different amount/interval/currency). Resolve it in Stripe before re-running.`);
    }
    outcomes.push({ itemId: item.itemId, lookupKey: item.lookupKey, unitAmountCents: item.unitAmountCents, action: "exists", priceId: found.id });
  }
  if (!apply) return outcomes;

  for (const outcome of outcomes) {
    if (outcome.action !== "create") continue;
    const item = plan.find((candidate) => candidate.itemId === outcome.itemId)!;
    const created = await client.createPrice({
      product_data: { name: item.productName, metadata: item.productMetadata },
      unit_amount: item.unitAmountCents,
      currency: "usd",
      recurring: { interval: "month" },
      lookup_key: item.lookupKey,
      metadata: item.priceMetadata,
    });
    outcome.priceId = created.id;
  }
  return outcomes;
}

/** { "<item_id>": "<price_id>" } for every outcome that has a price id - the STRIPE_ADDON_MONTHLY_PRICE_IDS value. */
export function addonPriceIdMap(outcomes: readonly AddonProvisionOutcome[]): Record<string, string> {
  return Object.fromEntries(outcomes.filter((outcome) => outcome.priceId).map((outcome) => [outcome.itemId, outcome.priceId as string]));
}
