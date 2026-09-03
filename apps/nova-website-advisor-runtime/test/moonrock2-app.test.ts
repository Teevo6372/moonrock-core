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
});
