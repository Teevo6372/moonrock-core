import { describe, expect, it } from "vitest";
import { createMoonrock2App } from "../src/http/moonrock2-app.js";
import type { StripeCheckoutConfig } from "../src/discovery-router.js";
import type { NovaConversationEngine } from "../src/dynamic-conversation-engine.js";
import { purchasableAddonOffers, suggestedAddonIdsFromText } from "../src/launch-addon-prices.js";

const PRICED = ["review_response_autopilot", "monthly_scorecard", "gbp_autopilot"];

function stripeWith(addonMonthlyPriceIds?: Record<string, string>, enabled = true): StripeCheckoutConfig {
  return {
    enabled,
    client: {} as StripeCheckoutConfig["client"],
    foundingSetupPriceId: "price_founding",
    standardSetupPriceId: "price_standard",
    monthlyPriceId: "price_monthly",
    successUrl: "https://example.test/success",
    cancelUrl: "https://example.test/cancel",
    ...(addonMonthlyPriceIds ? { addonMonthlyPriceIds } : {}),
  };
}

const pricesFor = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, `price_${id}`]));

function engineSaying(answer: string): NovaConversationEngine {
  return { respond: async () => ({ answer, mode: "generated" }) };
}

async function json(app: ReturnType<typeof createMoonrock2App>["app"], path: string, init?: RequestInit) {
  const response = await app.request(`http://localhost${path}`, init);
  return { status: response.status, body: (await response.json()) as any };
}
const postJson = (app: ReturnType<typeof createMoonrock2App>["app"], path: string, body: unknown) =>
  json(app, path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("suggestedAddonIdsFromText", () => {
  it("matches exact names, and Nova Monthly Scorecard without the Nova prefix, case-insensitively", () => {
    expect(suggestedAddonIdsFromText("Want Review Response Autopilot for $29/mo?", PRICED)).toEqual(["review_response_autopilot"]);
    expect(suggestedAddonIdsFromText("the monthly scorecard is the lightest add-on", PRICED)).toEqual(["monthly_scorecard"]);
    expect(suggestedAddonIdsFromText("Nova Monthly Scorecard and Google Business Profile Autopilot", PRICED)).toEqual(["gbp_autopilot", "monthly_scorecard"]);
  });

  it("ignores unpriced add-ons, gated add-ons, partial words and unrelated text", () => {
    expect(suggestedAddonIdsFromText("Referral Engine could help", PRICED)).toEqual([]);
    expect(suggestedAddonIdsFromText("Website Care Plan is great", ["website_care_plan"])).toEqual([]);
    expect(suggestedAddonIdsFromText("Review Response Autopilots", PRICED)).toEqual([]);
    expect(suggestedAddonIdsFromText("Tell me about your business.", PRICED)).toEqual([]);
    expect(suggestedAddonIdsFromText("Review Response Autopilot", [])).toEqual([]);
  });
});

describe("purchasableAddonOffers", () => {
  it("returns catalog name, price and a summary only for sellable, priced add-ons", () => {
    const offers = purchasableAddonOffers([...PRICED, "website_care_plan", "email_marketing"]);
    expect(offers.map((offer) => offer.id)).toEqual(["review_response_autopilot", "gbp_autopilot", "monthly_scorecard"]);
    expect(offers.find((offer) => offer.id === "monthly_scorecard")).toMatchObject({ name: "Nova Monthly Scorecard", monthlyFeeUsd: 19 });
    expect(offers.every((offer) => offer.summary.length > 0)).toBe(true);
  });
});

describe("GET /v1/discovery/addon-offers", () => {
  it("lists purchasable add-ons when checkout and add-on prices are configured", async () => {
    const { app } = createMoonrock2App({ stripe: stripeWith(pricesFor(PRICED)) });
    const result = await json(app, "/v1/discovery/addon-offers");
    expect(result.status).toBe(200);
    expect(result.body.addons.map((addon: { id: string }) => addon.id)).toEqual(["review_response_autopilot", "gbp_autopilot", "monthly_scorecard"]);
  });

  it("is empty when Stripe is off, has no add-on prices, or only gated ids are configured", async () => {
    for (const stripe of [undefined, stripeWith(pricesFor(PRICED), false), stripeWith(), stripeWith({ website_care_plan: "price_gated" })]) {
      const { app } = createMoonrock2App(stripe ? { stripe } : {});
      expect((await json(app, "/v1/discovery/addon-offers")).body).toEqual({ addons: [] });
    }
  });
});

describe("suggestedAddonIds on Nova turns", () => {
  it("is returned on the start and conversation responses when Nova names a purchasable add-on", async () => {
    const { app } = createMoonrock2App({
      stripe: stripeWith(pricesFor(PRICED)),
      conversationEngine: engineSaying("Review Response Autopilot could handle those Google reviews for you."),
    });
    const started = await postJson(app, "/v1/discovery/sug-1/start", { path: "existing_business" });
    expect(started.body.conversationTurn.suggestedAddonIds).toEqual(["review_response_autopilot"]);
    const asked = await postJson(app, "/v1/discovery/sug-1/conversation", { question: "What could help with reviews?" });
    expect(asked.body.suggestedAddonIds).toEqual(["review_response_autopilot"]);
  });

  it("is omitted when Nova names nothing purchasable, or add-ons are not configured", async () => {
    const plain = createMoonrock2App({ stripe: stripeWith(pricesFor(PRICED)), conversationEngine: engineSaying("Tell me more about your business.") });
    const started = await postJson(plain.app, "/v1/discovery/sug-2/start", { path: "existing_business" });
    expect(started.body.conversationTurn).not.toHaveProperty("suggestedAddonIds");

    const unpriced = createMoonrock2App({ conversationEngine: engineSaying("Review Response Autopilot is $29/mo.") });
    const other = await postJson(unpriced.app, "/v1/discovery/sug-3/start", { path: "existing_business" });
    expect(other.body.conversationTurn).not.toHaveProperty("suggestedAddonIds");
  });
});
