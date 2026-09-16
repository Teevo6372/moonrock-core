import { describe, expect, it } from "vitest";
import { createMoonrock2App } from "../src/http/moonrock2-app.js";
import type { PostgresLaunchPlanRepository } from "../src/postgres-launch-plan-repository.js";

function mockRepository(foundingCount: number): PostgresLaunchPlanRepository {
  return {
    countFoundingSignups: () => Promise.resolve(foundingCount),
    recordSignup: () => Promise.resolve(),
  } as unknown as PostgresLaunchPlanRepository;
}

/**
 * Bug found reviewing a real visitor transcript: a visitor asked "doesn't
 * this plan currently offer 0 setup cost" and Nova ducked the question
 * entirely. Root cause: /start never consulted the live founding-slot count,
 * so every Flight Plan always priced the $499 standard setup fee even while
 * the homepage's own "first 10 founding businesses get $0 setup" offer was
 * still live. These tests exercise the real HTTP flow end-to-end (not just
 * buildFlightPlan's own already-tested foundingCustomer option) to prove the
 * live count actually reaches the quoted price a visitor sees.
 */
describe("founding-customer setup fee reaches the visitor's Flight Plan", () => {
  async function completedFlightPlan(app: ReturnType<typeof createMoonrock2App>["app"], sessionId: string) {
    await app.request(`http://localhost/v1/discovery/${sessionId}/start`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: "existing_business" }),
    });
    const response = await app.request(`http://localhost/v1/discovery/${sessionId}/conversation`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: "Can you show me my flight plan now?" }),
    });
    return response.json() as Promise<{ result?: { flightPlan: { recommendation: { setupFeeUsd: number } } } }>;
  }

  it("quotes the $0 founding setup fee when live signups are below the limit", async () => {
    const { app } = createMoonrock2App({ launchPlanRepository: mockRepository(3) });
    const body = await completedFlightPlan(app, "founding-eligible-session");
    expect(body.result?.flightPlan.recommendation.setupFeeUsd).toBe(0);
  });

  it("quotes the standard $499 setup fee once live signups reach the founding limit", async () => {
    const { app } = createMoonrock2App({ launchPlanRepository: mockRepository(10) });
    const body = await completedFlightPlan(app, "founding-exhausted-session");
    expect(body.result?.flightPlan.recommendation.setupFeeUsd).toBe(499);
  });

  it("defaults to the standard $499 setup fee (never invents a discount) when no launch plan repository is configured", async () => {
    const { app } = createMoonrock2App();
    const body = await completedFlightPlan(app, "no-repository-session");
    expect(body.result?.flightPlan.recommendation.setupFeeUsd).toBe(499);
  });

  it("freezes the quoted fee for the life of the session even if slots fill up mid-conversation", async () => {
    let liveCount = 3;
    const repository = {
      countFoundingSignups: () => Promise.resolve(liveCount),
      recordSignup: () => Promise.resolve(),
    } as unknown as PostgresLaunchPlanRepository;
    const { app } = createMoonrock2App({ launchPlanRepository: repository });
    const sessionId = "founding-frozen-session";
    await app.request(`http://localhost/v1/discovery/${sessionId}/start`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: "existing_business" }),
    });

    liveCount = 10; // slots fill up after this visitor already started chatting

    const response = await app.request(`http://localhost/v1/discovery/${sessionId}/conversation`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: "Can you show me my flight plan now?" }),
    });
    const body = await response.json() as { result?: { flightPlan: { recommendation: { setupFeeUsd: number } } } };
    expect(body.result?.flightPlan.recommendation.setupFeeUsd).toBe(0);
  });
});
