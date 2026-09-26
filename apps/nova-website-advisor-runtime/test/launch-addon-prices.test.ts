import { describe, expect, it, vi } from "vitest";
import { ALA_CARTE_CATALOG, LAUNCH_ADDON_ITEM_IDS, isSellableLaunchAddonId } from "../src/ala-carte-catalog.js";
import { buildAddonProvisionPlan, parseAddonMonthlyPriceIds, sellableAddonIdsFrom } from "../src/launch-addon-prices.js";
import { addonPriceIdMap, provisionLaunchAddonPrices } from "../src/stripe-addon-provisioning.js";

const SELLABLE = ["review_response_autopilot", "referral_engine", "gbp_autopilot", "reactivation_newsletter", "monthly_scorecard"];
const GATED = ["social_content_autopilot", "local_seo_page_pack", "website_care_plan"];

describe("Launch add-on ids", () => {
  it("are all real catalog entries, and exactly the 5 sellable + 3 gated items", () => {
    for (const id of LAUNCH_ADDON_ITEM_IDS) expect(ALA_CARTE_CATALOG[id]).toBeDefined();
    expect(LAUNCH_ADDON_ITEM_IDS.filter(isSellableLaunchAddonId)).toEqual(SELLABLE);
    for (const id of GATED) expect(isSellableLaunchAddonId(id)).toBe(false);
  });

  it("rejects sellable non-Launch items and prototype keys", () => {
    expect(ALA_CARTE_CATALOG.email_marketing.sellable).toBe(true);
    expect(isSellableLaunchAddonId("email_marketing")).toBe(false);
    expect(isSellableLaunchAddonId("__proto__")).toBe(false);
    expect(isSellableLaunchAddonId("constructor")).toBe(false);
  });

  it("de-duplicates and filters requested ids", () => {
    expect(sellableAddonIdsFrom(["referral_engine", "referral_engine", "website_care_plan", "nope", "email_marketing"])).toEqual(["referral_engine"]);
  });
});

describe("buildAddonProvisionPlan", () => {
  it("covers only sellable Launch add-ons, priced from the catalog", () => {
    const plan = buildAddonProvisionPlan();
    expect(plan.map((item) => item.itemId)).toEqual(SELLABLE);
    expect(plan.map((item) => item.unitAmountCents)).toEqual([2900, 2900, 3900, 4900, 1900]);
    for (const item of plan) {
      expect(item.unitAmountCents).toBe(ALA_CARTE_CATALOG[item.itemId as keyof typeof ALA_CARTE_CATALOG].monthlyFeeUsd * 100);
      expect(item.lookupKey).toBe(`moonrock_addon_${item.itemId}_monthly`);
      expect(item.priceMetadata).toEqual({ moonrock_offer_id: item.itemId, moonrock_price_role: "addon_monthly" });
      expect(item.productName).not.toMatch(/launch plan/i);
    }
  });
});

describe("parseAddonMonthlyPriceIds", () => {
  it("returns undefined without warnings when absent or empty", () => {
    expect(parseAddonMonthlyPriceIds(undefined)).toEqual({ priceIds: undefined, warnings: [] });
    expect(parseAddonMonthlyPriceIds("  ")).toEqual({ priceIds: undefined, warnings: [] });
  });

  it("parses a valid map", () => {
    const { priceIds, warnings } = parseAddonMonthlyPriceIds(JSON.stringify({ referral_engine: "price_1", monthly_scorecard: " price_2 " }));
    expect(priceIds).toEqual({ referral_engine: "price_1", monthly_scorecard: "price_2" });
    expect(warnings).toEqual([]);
  });

  it("does not throw on malformed JSON or non-objects, and warns without echoing the value", () => {
    for (const raw of ["{not json price_secret", "[1,2]", "\"price_x\"", "null"]) {
      const result = parseAddonMonthlyPriceIds(raw);
      expect(result.priceIds).toBeUndefined();
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).not.toContain("price_secret");
    }
  });

  it("drops gated, unknown, non-Launch and malformed entries", () => {
    const { priceIds, warnings } = parseAddonMonthlyPriceIds(JSON.stringify({
      referral_engine: "price_ok",
      website_care_plan: "price_gated",
      email_marketing: "price_older_item",
      bogus: "price_x",
      gbp_autopilot: "prod_wrong_kind",
      monthly_scorecard: 5,
    }));
    expect(priceIds).toEqual({ referral_engine: "price_ok" });
    expect(warnings).toHaveLength(5);
    expect(warnings.join("\n")).not.toContain("price_gated");
  });

  it("returns undefined when every entry is rejected", () => {
    expect(parseAddonMonthlyPriceIds(JSON.stringify({ website_care_plan: "price_gated" })).priceIds).toBeUndefined();
  });
});

describe("provisionLaunchAddonPrices", () => {
  const existingPrice = (id: string, lookupKey: string, amount: number, overrides = {}) =>
    ({ id, active: true, lookup_key: lookupKey, unit_amount: amount, currency: "usd", recurring: { interval: "month" }, ...overrides });

  it("dry-run lists creates without creating anything", async () => {
    const createPrice = vi.fn();
    const client = { listPricesByLookupKeys: vi.fn().mockResolvedValue([]), createPrice };
    const outcomes = await provisionLaunchAddonPrices(client, false);
    expect(outcomes.map((o) => o.action)).toEqual(SELLABLE.map(() => "create"));
    expect(createPrice).not.toHaveBeenCalled();
    expect(client.listPricesByLookupKeys).toHaveBeenCalledWith(SELLABLE.map((id) => `moonrock_addon_${id}_monthly`));
  });

  it("apply creates each price atomically with a lookup key and never a Launch Plan object", async () => {
    let n = 0;
    const createPrice = vi.fn().mockImplementation(async () => ({ id: `price_new_${++n}` }));
    const outcomes = await provisionLaunchAddonPrices({ listPricesByLookupKeys: vi.fn().mockResolvedValue([]), createPrice }, true);
    expect(createPrice).toHaveBeenCalledTimes(5);
    const first = createPrice.mock.calls[0]![0];
    expect(first).toMatchObject({
      product_data: { name: "Moonrock Add-On: Review Response Autopilot", metadata: { moonrock_offer_id: "review_response_autopilot" } },
      unit_amount: 2900,
      currency: "usd",
      recurring: { interval: "month" },
      lookup_key: "moonrock_addon_review_response_autopilot_monthly",
    });
    expect(first.product).toBeUndefined();
    expect(addonPriceIdMap(outcomes)).toEqual({
      review_response_autopilot: "price_new_1", referral_engine: "price_new_2", gbp_autopilot: "price_new_3",
      reactivation_newsletter: "price_new_4", monthly_scorecard: "price_new_5",
    });
  });

  it("skips items whose lookup key already exists and only creates the rest", async () => {
    const createPrice = vi.fn().mockResolvedValue({ id: "price_new" });
    const client = {
      listPricesByLookupKeys: vi.fn().mockResolvedValue([existingPrice("price_have", "moonrock_addon_referral_engine_monthly", 2900)]),
      createPrice,
    };
    const outcomes = await provisionLaunchAddonPrices(client, true);
    expect(createPrice).toHaveBeenCalledTimes(4);
    expect(outcomes.find((o) => o.itemId === "referral_engine")).toMatchObject({ action: "exists", priceId: "price_have" });
    expect(addonPriceIdMap(outcomes).referral_engine).toBe("price_have");
  });

  it("is a no-op when everything already exists", async () => {
    const createPrice = vi.fn();
    const all = buildAddonProvisionPlan().map((item) => existingPrice(`price_${item.itemId}`, item.lookupKey, item.unitAmountCents));
    const outcomes = await provisionLaunchAddonPrices({ listPricesByLookupKeys: vi.fn().mockResolvedValue(all), createPrice }, true);
    expect(createPrice).not.toHaveBeenCalled();
    expect(outcomes.every((o) => o.action === "exists")).toBe(true);
  });

  it("aborts before creating anything when an existing price conflicts with the catalog", async () => {
    for (const bad of [{ unit_amount: 999 }, { active: false }, { recurring: { interval: "year" } }]) {
      const createPrice = vi.fn();
      const client = { listPricesByLookupKeys: vi.fn().mockResolvedValue([existingPrice("price_bad", "moonrock_addon_referral_engine_monthly", 2900, bad)]), createPrice };
      await expect(provisionLaunchAddonPrices(client, true)).rejects.toThrow(/does not match the catalog/);
      expect(createPrice).not.toHaveBeenCalled();
    }
  });
});
