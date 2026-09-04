import { describe, expect, it } from "vitest";
import { startNovaDiscovery, type NovaDiscoveryResponse } from "../src/discovery-api-contract.js";
import { toImmersiveNovaView } from "../src/higgsfield-ui-adapter.js";

describe("toImmersiveNovaView", () => {
  it("settles on listening when Nova is waiting for a discovery answer", () => {
    const { response } = startNovaDiscovery("startup");
    const view = toImmersiveNovaView(response);

    expect(response.nextQuestion).toBeDefined();
    expect(view.visualState).toBe("listening");
    expect(view.flightPlanReady).toBe(false);
  });

  it("settles on idle when there is no active prompt or result", () => {
    const response: NovaDiscoveryResponse = {
      path: "startup",
      completed: false,
      tier: "ai_employee",
      progress: { answered: 0, requiredRemaining: 0 },
      progressiveFlightPlan: {
        phase: "listening",
        summary: "Still listening.",
        signals: [],
        nextFocus: "Understanding the business",
      },
    };

    expect(toImmersiveNovaView(response).visualState).toBe("idle");
  });
});
