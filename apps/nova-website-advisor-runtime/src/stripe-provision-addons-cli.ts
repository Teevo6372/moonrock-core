import { addonPriceIdMap, provisionLaunchAddonPrices } from "./stripe-addon-provisioning.js";
import { StripeClient } from "./stripe-client.js";

/**
 * Creates one monthly Stripe Price (with its Product) per sellable Launch
 * add-on, derived from ALA_CARTE_CATALOG. Dry-run by default; --apply creates.
 * Re-runnable: prices are keyed by lookup_key moonrock_addon_<item_id>_monthly
 * and existing ones are skipped. Never touches Launch Plan objects (that is
 * stripe-provision-catalog-cli.ts). Needs a key with Products + Prices write,
 * so use a separate temporary key locally, never the restricted Railway key.
 * A live key is refused with --apply unless --live is also passed.
 *
 * Output: the JSON to set as STRIPE_ADDON_MONTHLY_PRICE_IDS.
 */
async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const allowLive = process.argv.includes("--live");
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is required");
  const liveKey = /^(sk|rk)_live_/.test(secretKey);
  if (apply && liveKey && !allowLive) {
    throw new Error("Refusing to --apply with a live-mode key. Re-run with --live only after explicit approval.");
  }

  const outcomes = await provisionLaunchAddonPrices(new StripeClient({ secretKey }), apply);
  process.stdout.write(`${JSON.stringify({ mode: apply ? "apply" : "dry-run", stripeKeyMode: liveKey ? "live" : "test", plan: outcomes }, null, 2)}\n`);
  if (!apply) {
    process.stdout.write("Dry run only. Re-run with --apply to create the items marked \"create\".\n");
    return;
  }
  process.stdout.write(`\nSet this as STRIPE_ADDON_MONTHLY_PRICE_IDS:\n${JSON.stringify(addonPriceIdMap(outcomes))}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown Stripe provisioning failure";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
