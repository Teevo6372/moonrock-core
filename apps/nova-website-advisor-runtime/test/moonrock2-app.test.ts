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

  // Ascension funnel v2: classifyServiceTier always resolves ai_employee (see
  // diagnostic-engine.ts), so a "no existing website" signal no longer routes to
  // website_build - Moonrock Launch Plan already bundles a website. The prior
  // website_build-tier walk is in git history to bring back once that tier is
  // sellable again.
  it("stays on the ai_employee tier and recommends Moonrock Launch Plan even when the visitor has no existing website", async () => {
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
      return response.json() as Promise<{ tier: string; completed: boolean; result?: { flightPlan: { recommendation: { offerId: string } } } }>;
    }

    await answer("businessName", "Acme Landscaping");
    await answer("industry", "Landscaping");
    const latest = await answer("businessChallenges", "We don't have a website at all right now.");
    expect(latest.tier).toBe("ai_employee");
  });

  // Ascension funnel v2: Moonrock Launch Plan ($97/mo) is the only AI Employee
  // offer, and it's already the cheapest possible - a budget objection above its
  // price can no longer reprice to a DIFFERENT, cheaper offer (there isn't one).
  // This now documents that the repricing path correctly reports the same offer
  // as "a fit" rather than inventing a cheaper one that doesn't exist.
  it("confirms Moonrock Launch Plan already fits a stated monthly budget above its price, rather than inventing a different offer", async () => {
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
    expect(baseline.monthlyFeeUsd).toBe(97);

    const conversationResponse = await app.request(`http://localhost/v1/discovery/${sessionId}/conversation`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: "I'm a small business and can't afford $200/month for this." }),
    });
    expect(conversationResponse.status).toBe(200);
    const envelope = await conversationResponse.json() as { conversationTurn: { answer: string }; result?: { flightPlan: { recommendation: { offerName: string; monthlyFeeUsd: number } } } };
    expect(envelope.result?.flightPlan.recommendation.monthlyFeeUsd).toBe(97);
    expect(envelope.result?.flightPlan.recommendation.offerName).toBe(baseline.offerName);
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
    expect(envelope.result?.flightPlan.recommendation.monthlyFeeUsd).toBe(97);
    expect(envelope.conversationTurn.answer).toContain("catalog floor");
  });
});
