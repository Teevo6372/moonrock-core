import { describe, expect, it } from "vitest";
import { createMoonrock2App } from "../src/http/moonrock2-app.js";
import { MOONROCK_PRODUCTION_GHL_FIELD_REGISTRY } from "../src/ghl-production-registry.js";
import { restoreNovaDiscovery } from "../src/discovery-api-contract.js";
import { buildGhlFlightPlanSyncPlan } from "../src/ghl-flight-plan-sync.js";
import type { DiagnosticInput } from "../src/diagnostic-engine.js";

/**
 * End-to-end walk of a full visitor conversation through to the GHL handoff
 * boundary. Runs against the real router/session/diagnostic/flight-plan
 * pipeline with a dry-run GHL config (writesEnabled: false) so it exercises
 * every code path up to - but never actually performs - a live CRM write.
 */
describe("discovery to GHL handoff (dry run)", () => {
  it("carries a full Prairie Card Shop conversation through to a dry-run CRM handoff", async () => {
    const { app } = createMoonrock2App({
      productionGhl: {
        enabled: true,
        fieldsVerified: true,
        writesEnabled: false,
        locationId: "dry-run-location",
        accessToken: "dry-run-token",
        fieldRegistry: MOONROCK_PRODUCTION_GHL_FIELD_REGISTRY,
      },
    });
    const sessionId = "e2e-card-shop-dry-run-001";

    async function post(path: string, body: unknown) {
      const response = await app.request(`http://localhost${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      return { status: response.status, json: (await response.json()) as any };
    }

    const start = await post(`/v1/discovery/${sessionId}/start`, { path: "existing_business" });
    expect(start.status).toBe(201);

    const a1 = await post(`/v1/discovery/${sessionId}/answers`, { field: "businessName", value: "Prairie Card Shop" });
    expect(a1.status).toBe(200);

    const a2 = await post(`/v1/discovery/${sessionId}/answers`, { field: "industry", value: "retail" });
    expect(a2.status).toBe(200);

    const a3 = await post(`/v1/discovery/${sessionId}/answers`, { field: "missedCallsPerMonth", value: 10 });
    expect(a3.status).toBe(200);

    const a4 = await post(`/v1/discovery/${sessionId}/answers`, { field: "medianLeadResponseMinutes", value: 45 });
    expect(a4.status).toBe(200);
    expect(a4.json.completed).toBe(true);
    expect(a4.json.result.flightPlan.recommendation.monthlyFeeUsd).toBeGreaterThan(200);

    const budgetObjection = await post(`/v1/discovery/${sessionId}/conversation`, {
      question: "I'm a small business and can't afford $200/month for this.",
    });
    expect(budgetObjection.status).toBe(200);
    expect(typeof budgetObjection.json.conversationTurn.answer).toBe("string");
    expect(budgetObjection.json.conversationTurn.answer.length).toBeGreaterThan(0);

    const identity = { email: "e2e-dry-run@example.com", firstName: "Prairie", lastName: "Card Shop Owner", companyName: "Prairie Card Shop" };

    const save = await post(`/v1/discovery/${sessionId}/save-flight-plan`, { identity });
    expect(save.status).toBe(200);
    expect(save.json.status).toBe("dry_run");

    const handoff = await post(`/v1/discovery/${sessionId}/handoff`, {
      identity,
      requestText: "Can someone call me to walk through this?",
    });
    expect(handoff.status).toBe(200);
    expect(handoff.json.humanHandoff.status).toBe("dry_run");
    expect(handoff.json.humanHandoff.tagsApplied).toContain("nova-human-handoff-requested");

    const getResponse = await app.request(`http://localhost/v1/discovery/${sessionId}`);
    const finalState = (await getResponse.json()) as any;
    const restored = restoreNovaDiscovery(finalState.state);
    expect(restored.result).toBeDefined();

    const plan = buildGhlFlightPlanSyncPlan({
      sessionId,
      diagnosticInput: finalState.state.answers as DiagnosticInput,
      diagnostic: restored.result!.diagnostic,
      flightPlan: restored.result!.flightPlan,
      fieldRegistry: MOONROCK_PRODUCTION_GHL_FIELD_REGISTRY,
    });
    const kinds = plan.operations.map((operation) => operation.kind);
    expect(kinds).toEqual(expect.arrayContaining(["upsert_contact", "upsert_opportunity", "add_tags", "add_note"]));
  });
});
