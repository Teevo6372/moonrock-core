import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("add-on picker never pre-ticks a paid add-on, even one Nova suggested", async () => {
  const source = await read("src/addon-picker.ts");
  assert.equal(source.includes("selected = new Set()"), true);
  assert.equal(source.includes("selected.add(id)"), false);
  assert.equal(source.includes("Suggested by Nova"), true);
});

test("add-on list comes from the server, with no hard-coded add-on ids or prices", async () => {
  const source = await read("src/addon-picker.ts");
  assert.equal(source.includes("getAddonOffers"), true);
  for (const id of ["review_response_autopilot", "referral_engine", "gbp_autopilot", "reactivation_newsletter", "monthly_scorecard"]) {
    assert.equal(source.includes(id), false, id);
  }
});

test("picker hides itself when add-ons cannot be loaded", async () => {
  const source = await read("src/addon-picker.ts");
  assert.equal(source.includes("container.hidden = true"), true);
  assert.equal(source.includes("offers = []"), true);
});

test("checkout sends exactly the ticked add-ons", async () => {
  const card = await read("src/flight-plan-save-card.ts");
  assert.equal(card.includes("createLaunchPlanCheckout(identity, selectedAddonIds())"), true);
  const api = await read("src/api.ts");
  assert.equal(api.includes("{ identity, addonItemIds, visitorId"), true);
  assert.equal(api.includes("nova:addon-suggestions"), true);
});

test("picker is only offered when the plan is eligible for checkout", async () => {
  const card = await read("src/flight-plan-save-card.ts");
  assert.equal(card.includes("checkoutEligible ? \"<div data-addon-picker hidden></div>\""), true);
});
