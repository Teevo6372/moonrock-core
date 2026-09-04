import { describe, expect, it } from "vitest";
import type { NovaConversationTurn } from "../src/dynamic-conversation-engine.js";
import { MOONROCK_PRODUCTION_GHL_FIELD_REGISTRY } from "../src/ghl-production-registry.js";
import type { ProductionGhlHandoffConfig } from "../src/ghl-production-handoff.js";
import { createMoonrock2App } from "../src/http/moonrock2-app.js";

describe("Moonrock 2 app", () => {
  it("mounts the Nova discovery router", async () => {
    const { app } = createMoonrock2App();
    const response = await app.request("http://localhost/v1/discovery/test-session/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: "startup" }),
    });
    expect(response.status).toBe(201);
    const body = await response.json() as { path: string; view: { flightPlanReady: boolean } };
    expect(body.path).toBe("startup");
    expect(body.view.flightPlanReady).toBe(false);
  });

  it("reports disconnected local-mock readiness when no live providers are supplied", async () => {
    const { app } = createMoonrock2App();
    const ready = await app.request("/health/ready");
    expect(await ready.json()).toMatchObject({ mode: "local-mock", providers: "disconnected" });
  });

  it("reports live readiness once the LLM and GHL adapters are wired", async () => {
    const conversationEngine = {
      respond: (): Promise<NovaConversationTurn> =>
        Promise.resolve({ mode: "grounded_fallback", intent: "pause_discovery", answer: "test" }),
    };
    const productionGhl: ProductionGhlHandoffConfig = {
      enabled: true,
      fieldsVerified: true,
      writesEnabled: true,
      locationId: "test-location",
      accessToken: "test-token",
      fieldRegistry: MOONROCK_PRODUCTION_GHL_FIELD_REGISTRY,
    };
    const { app } = createMoonrock2App({ conversationEngine, productionGhl });
    const ready = await app.request("/health/ready");
    expect(await ready.json()).toMatchObject({ mode: "live", providers: "connected" });
  });

  it("reports partially-connected when only one live provider is wired", async () => {
    const conversationEngine = {
      respond: (): Promise<NovaConversationTurn> =>
        Promise.resolve({ mode: "grounded_fallback", intent: "pause_discovery", answer: "test" }),
    };
    const { app } = createMoonrock2App({ conversationEngine });
    const ready = await app.request("/health/ready");
    expect(await ready.json()).toMatchObject({ mode: "live", providers: "partially-connected" });
  });

  it("routes a visitor with no existing website to the website_build tier and produces a brief", async () => {
    const { app } = createMoonrock2App();
    const sessionId = "test-website-build-session";
    await app.request(`http://localhost/v1/discovery/${sessionId}/start`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: "existing_business" }),
    });

    async function answer(field: string, value: unknown) {
      const response = await app.request(`http://localhost/v1/discovery/${sessionId}/answers`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ field, value }),
      });
      return response.json() as Promise<{ tier: string; completed: boolean; websiteBuildResult?: { brief: { offerId: string; offerName: string } } }>;
    }

    await answer("businessName", "Acme Landscaping");
    await answer("industry", "Landscaping");
    let latest = await answer("businessChallenges", "We don't have a website at all right now.");
    expect(latest.tier).toBe("website_build");

    latest = await answer("hasExistingWebsite", false);
    latest = await answer("websiteScopeNeeded", "multi_page");

    expect(latest.completed).toBe(true);
    expect(latest.tier).toBe("website_build");
    expect(latest.websiteBuildResult?.brief.offerId).toBe("growth_site");
    expect(latest.websiteBuildResult?.brief.offerName).toBe("Growth Site");
  });

  it("reprices the completed Flight Plan when the visitor states a monthly budget objection in free-text conversation (regression: previously Nova could offer to reprice but never actually could)", async () => {
    const { app } = createMoonrock2App();
    const sessionId = "test-budget-objection-session";
    await app.request(`http://localhost/v1/discovery/${sessionId}/start`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: "existing_business" }),
    });

    async function answer(field: string, value: unknown) {
      const response = await app.request(`http://localhost/v1/discovery/${sessionId}/answers`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ field, value }),
      });
      return response.json() as Promise<{ tier: string; completed: boolean; result?: { flightPlan: { recommendation: { offerName: string; monthlyFeeUsd: number } } } }>;
    }

    await answer("businessName", "Prairie Card Shop");
    await answer("industry", "retail");
    await answer("missedCallsPerMonth", 10);
    const latest = await answer("medianLeadResponseMinutes", 45);
    expect(latest.completed).toBe(true);
    expect(latest.tier).toBe("ai_employee");
    const baseline = latest.result!.flightPlan.recommendation;
    expect(baseline.monthlyFeeUsd).toBeGreaterThan(200);

    const conversationResponse = await app.request(`http://localhost/v1/discovery/${sessionId}/conversation`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: "I'm a small business and can't afford $200/month for this." }),
    });
    expect(conversationResponse.status).toBe(200);
    const envelope = await conversationResponse.json() as { conversationTurn: { answer: string }; result?: { flightPlan: { recommendation: { offerName: string; monthlyFeeUsd: number } } } };
    expect(envelope.result?.flightPlan.recommendation.monthlyFeeUsd).toBeLessThanOrEqual(200);
    expect(envelope.result?.flightPlan.recommendation.offerName).not.toBe(baseline.offerName);
    expect(envelope.conversationTurn.answer).toContain("$200/month budget");
  });

  it("is honest about the catalog floor instead of inventing a discount when even the cheapest offer exceeds the stated budget", async () => {
    const { app } = createMoonrock2App();
    const sessionId = "test-budget-floor-session";
    await app.request(`http://localhost/v1/discovery/${sessionId}/start`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: "existing_business" }),
    });
    async function answer(field: string, value: unknown) {
      const response = await app.request(`http://localhost/v1/discovery/${sessionId}/answers`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ field, value }),
      });
      return response.json() as Promise<{ completed: boolean }>;
    }
    await answer("businessName", "Prairie Card Shop");
    await answer("industry", "retail");
    await answer("missedCallsPerMonth", 10);
    await answer("medianLeadResponseMinutes", 45);

    const conversationResponse = await app.request(`http://localhost/v1/discovery/${sessionId}/conversation`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: "Honestly my budget is only $10/month, can we do that?" }),
    });
    const envelope = await conversationResponse.json() as { conversationTurn: { answer: string }; result?: { flightPlan: { recommendation: { monthlyFeeUsd: number } } } };
    expect(envelope.result?.flightPlan.recommendation.monthlyFeeUsd).toBe(149);
    expect(envelope.conversationTurn.answer).toContain("catalog floor");
  });
});
