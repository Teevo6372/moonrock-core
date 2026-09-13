import { describe, expect, it } from "vitest";
import { createMoonrock2App } from "../src/http/moonrock2-app.js";
import { MOONROCK_PRODUCTION_GHL_FIELD_REGISTRY } from "../src/ghl-production-registry.js";

/**
 * Server-side backstop for isPlausibleName (apps/moonrock-2-frontend/src/identity-validation.ts) -
 * blocks a direct API call (bypassing the frontend form entirely) from
 * pushing a question or sentence into GHL as a contact's name.
 */
describe("GHL handoff name validation", () => {
  function buildApp() {
    return createMoonrock2App({
      productionGhl: {
        enabled: true,
        fieldsVerified: true,
        writesEnabled: false,
        locationId: "dry-run-location",
        accessToken: "dry-run-token",
        fieldRegistry: MOONROCK_PRODUCTION_GHL_FIELD_REGISTRY,
      },
    });
  }

  async function post(app: ReturnType<typeof buildApp>["app"], path: string, body: unknown) {
    const response = await app.request(`http://localhost${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: response.status, json: (await response.json()) as any };
  }

  async function completeFlightPlan(app: ReturnType<typeof buildApp>["app"], sessionId: string) {
    await post(app, `/v1/discovery/${sessionId}/start`, { path: "existing_business" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "businessName", value: "Prairie Card Shop" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "industry", value: "retail" });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "missedCallsPerMonth", value: 10 });
    await post(app, `/v1/discovery/${sessionId}/answers`, { field: "medianLeadResponseMinutes", value: 45 });
  }

  it("rejects a save-flight-plan identity whose first name is a sentence", async () => {
    const { app } = buildApp();
    const sessionId = "name-validation-flight-plan-001";
    await completeFlightPlan(app, sessionId);

    const save = await post(app, `/v1/discovery/${sessionId}/save-flight-plan`, {
      identity: { email: "test@example.com", firstName: "What does this cost?", lastName: "Doe" },
    });
    expect(save.status).toBe(503);
    expect(save.json.detail).toMatch(/first name does not look like a valid name/i);
  });

  it("rejects a save-flight-plan identity whose last name is a sentence", async () => {
    const { app } = buildApp();
    const sessionId = "name-validation-flight-plan-002";
    await completeFlightPlan(app, sessionId);

    const save = await post(app, `/v1/discovery/${sessionId}/save-flight-plan`, {
      identity: { email: "test@example.com", firstName: "Jane", lastName: "please call me back thanks" },
    });
    expect(save.status).toBe(503);
    expect(save.json.detail).toMatch(/last name does not look like a valid name/i);
  });

  it("accepts a real name for save-flight-plan", async () => {
    const { app } = buildApp();
    const sessionId = "name-validation-flight-plan-003";
    await completeFlightPlan(app, sessionId);

    const save = await post(app, `/v1/discovery/${sessionId}/save-flight-plan`, {
      identity: { email: "test@example.com", firstName: "Mary-Jane", lastName: "O'Brien" },
    });
    expect(save.status).toBe(200);
  });

  it("rejects a human-handoff identity whose name is a sentence", async () => {
    const { app } = buildApp();
    const sessionId = "name-validation-handoff-001";
    await post(app, `/v1/discovery/${sessionId}/start`, { path: "existing_business" });

    const handoff = await post(app, `/v1/discovery/${sessionId}/handoff`, {
      identity: { email: "test@example.com", firstName: "Can someone please call me?", lastName: "Doe" },
      requestText: "Please have someone reach out.",
    });
    expect(handoff.status).toBe(503);
    expect(handoff.json.detail).toMatch(/first name does not look like a valid name/i);
  });
});
