import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("obsolete resume overlay is not loaded", async () => {
  const html = await read("index.html");
  assert.equal(html.includes("resume-chat-binding"), false);
});

test("voice chat does not observe characterData or maintain its own answer counter", async () => {
  const source = await read("src/voice-chat-experience.ts");
  assert.equal(source.includes("characterData: true"), false);
  assert.equal(source.includes("learnedCount += 1"), false);
  assert.equal(source.includes("nova:conversation-state"), true);
});

test("flight-plan details have no duplicate commercial catalog", async () => {
  const source = await read("src/flight-plan-details.ts");
  assert.equal(source.includes("DETAILS_BY_OFFER"), false);
  assert.equal(source.includes("includedFeatures"), true);
  assert.equal(source.includes("estimatedDelivery"), true);
});

test("Flight Plan save is independent from discovery answer submission", async () => {
  const source = await read("src/flight-plan-save-card.ts");
  assert.equal(source.includes("data-flight-plan-save-form"), true);
  assert.equal(source.includes("saveFlightPlan(identity)"), true);
  assert.equal(source.includes("requestSubmit()"), false);
});
