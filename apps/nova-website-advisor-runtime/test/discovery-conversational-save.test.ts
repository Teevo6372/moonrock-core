import { describe, expect, it } from "vitest";
import { createMoonrock2App } from "../src/http/moonrock2-app.js";
import { MOONROCK_PRODUCTION_GHL_FIELD_REGISTRY } from "../src/ghl-production-registry.js";

/**
 * The conversational Flight Plan save path (see PendingConversationalSave in
 * discovery-session.ts and handlePendingSave in discovery-router.ts) - lets a
 * visitor say "lock it in" in chat and save without ever touching the
 * separate Save Flight Plan form. Runs against a dry-run GHL config so it
 * exercises every step up to - but never actually performs - a live CRM write.
 */
describe("conversational Flight Plan save", () => {
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
    const last = await post(app, `/v1/discovery/${sessionId}/answers`, { field: "medianLeadResponseMinutes", value: 45 });
    expect(last.json.completed).toBe(true);
  }

  it("walks name -> email -> explicit yes to a dry-run save", async () => {
    const { app } = buildApp();
    const sessionId = "conv-save-happy-path-001";
    await completeFlightPlan(app, sessionId);

    const start = await post(app, `/v1/discovery/${sessionId}/conversation`, { question: "lock it in" });
    expect(start.status).toBe(200);
    expect(start.json.conversationTurn.answer).toMatch(/name/i);

    const name = await post(app, `/v1/discovery/${sessionId}/conversation`, { question: "Jane Doe" });
    expect(name.status).toBe(200);
    expect(name.json.conversationTurn.answer).toMatch(/jane/i);
    expect(name.json.conversationTurn.answer).toMatch(/email/i);

    const email = await post(app, `/v1/discovery/${sessionId}/conversation`, { question: "jane@example.com" });
    expect(email.status).toBe(200);
    expect(email.json.conversationTurn.answer).toMatch(/jane@example\.com/);
    expect(email.json.conversationTurn.answer).toMatch(/yes/i);

    const confirm = await post(app, `/v1/discovery/${sessionId}/conversation`, { question: "yes" });
    expect(confirm.status).toBe(200);
    // Dry-run config (writesEnabled: false) - same "ready but not written" wording /save-flight-plan gives, not a live confirmation.
    expect(confirm.json.conversationTurn.answer).toMatch(/ready.*live CRM writes are currently disabled/i);

    const finalState = await (await app.request(`http://localhost/v1/discovery/${sessionId}`)).json() as any;
    expect(finalState.state.pendingSave).toBeUndefined();
  });

  it("re-asks for email when the reply has no valid address, without losing the collected name", async () => {
    const { app } = buildApp();
    const sessionId = "conv-save-bad-email-001";
    await completeFlightPlan(app, sessionId);

    await post(app, `/v1/discovery/${sessionId}/conversation`, { question: "I'm ready to sign up" });
    await post(app, `/v1/discovery/${sessionId}/conversation`, { question: "Jane Doe" });
    const badEmail = await post(app, `/v1/discovery/${sessionId}/conversation`, { question: "not an email" });
    expect(badEmail.json.conversationTurn.answer).toMatch(/didn.t catch a valid email/i);

    const goodEmail = await post(app, `/v1/discovery/${sessionId}/conversation`, { question: "jane@example.com" });
    expect(goodEmail.json.conversationTurn.answer).toMatch(/jane@example\.com/);
  });

  it("cancels and saves nothing when the visitor declines consent", async () => {
    const { app } = buildApp();
    const sessionId = "conv-save-decline-001";
    await completeFlightPlan(app, sessionId);

    await post(app, `/v1/discovery/${sessionId}/conversation`, { question: "let's get started" });
    await post(app, `/v1/discovery/${sessionId}/conversation`, { question: "Jane Doe" });
    await post(app, `/v1/discovery/${sessionId}/conversation`, { question: "jane@example.com" });
    const decline = await post(app, `/v1/discovery/${sessionId}/conversation`, { question: "no thanks" });
    expect(decline.json.conversationTurn.answer).toMatch(/won.t save anything/i);

    const finalState = await (await app.request(`http://localhost/v1/discovery/${sessionId}`)).json() as any;
    expect(finalState.state.pendingSave).toBeUndefined();
  });

  it("lets 'never mind' cancel mid-flow at any stage", async () => {
    const { app } = buildApp();
    const sessionId = "conv-save-cancel-mid-001";
    await completeFlightPlan(app, sessionId);

    await post(app, `/v1/discovery/${sessionId}/conversation`, { question: "lock it in" });
    const cancel = await post(app, `/v1/discovery/${sessionId}/conversation`, { question: "never mind" });
    expect(cancel.json.conversationTurn.answer).toMatch(/won.t save anything/i);

    const finalState = await (await app.request(`http://localhost/v1/discovery/${sessionId}`)).json() as any;
    expect(finalState.state.pendingSave).toBeUndefined();
  });
});
