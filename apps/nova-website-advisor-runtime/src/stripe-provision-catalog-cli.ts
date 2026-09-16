import { AI_EMPLOYEE_CATALOG } from "./ai-employee-catalog.js";
import { StripeClient } from "./stripe-client.js";

/**
 * One-time setup script - creates the Stripe Product + 3 Prices for Moonrock
 * Launch Plan (founding $0 setup, standard $499 setup, $97/mo recurring), tagged
 * with moonrock_offer_id metadata. Dry-run by default; pass --apply to actually
 * create them in Stripe. Print the resulting Price ids and set them as
 * STRIPE_LAUNCH_PLAN_FOUNDING_SETUP_PRICE_ID / STRIPE_LAUNCH_PLAN_STANDARD_SETUP_PRICE_ID /
 * STRIPE_LAUNCH_PLAN_MONTHLY_PRICE_ID in Railway.
 *
 * Safe to run against the test-mode key any number of times in dry-run mode;
 * --apply always creates NEW Stripe objects (Stripe's Products/Prices API has
 * no natural idempotency key here), so only run --apply once per environment.
 */
async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is required");
  const offer = AI_EMPLOYEE_CATALOG.moonrock_launch_plan;
  const client = new StripeClient({ secretKey });

  const plan = {
    mode: apply ? "apply" : "dry-run",
    product: { name: offer.name, metadata: { moonrock_offer_id: offer.id } },
    prices: [
      { label: "founding setup (one-time)", unit_amount: (offer.foundingCustomerSetupFeeUsd ?? offer.setupFeeUsd) * 100, currency: "usd" },
      { label: "standard setup (one-time)", unit_amount: offer.setupFeeUsd * 100, currency: "usd" },
      { label: "monthly (recurring)", unit_amount: offer.monthlyFeeUsd * 100, currency: "usd", recurring: { interval: "month" as const } },
    ],
  };

  if (!apply) {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    process.stdout.write("Dry run only. Re-run with --apply to actually create these in Stripe.\n");
    return;
  }

  const product = await client.createProduct({ name: offer.name, metadata: { moonrock_offer_id: offer.id } });
  const foundingSetupPrice = await client.createPrice({ product: product.id, unit_amount: (offer.foundingCustomerSetupFeeUsd ?? offer.setupFeeUsd) * 100, currency: "usd", metadata: { moonrock_offer_id: offer.id, moonrock_price_role: "founding_setup" } });
  const standardSetupPrice = await client.createPrice({ product: product.id, unit_amount: offer.setupFeeUsd * 100, currency: "usd", metadata: { moonrock_offer_id: offer.id, moonrock_price_role: "standard_setup" } });
  const monthlyPrice = await client.createPrice({ product: product.id, unit_amount: offer.monthlyFeeUsd * 100, currency: "usd", recurring: { interval: "month" }, metadata: { moonrock_offer_id: offer.id, moonrock_price_role: "monthly" } });

  process.stdout.write(`${JSON.stringify({
    productId: product.id,
    STRIPE_LAUNCH_PLAN_FOUNDING_SETUP_PRICE_ID: foundingSetupPrice.id,
    STRIPE_LAUNCH_PLAN_STANDARD_SETUP_PRICE_ID: standardSetupPrice.id,
    STRIPE_LAUNCH_PLAN_MONTHLY_PRICE_ID: monthlyPrice.id,
  }, null, 2)}\n`);
  process.stdout.write("Set the three price ids above as Railway variables, then set NOVA_STRIPE_ENABLED=true when ready.\n");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown Stripe provisioning failure";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
