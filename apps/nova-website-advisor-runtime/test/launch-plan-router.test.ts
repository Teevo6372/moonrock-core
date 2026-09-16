import { describe, expect, it } from "vitest";
import { createMoonrock2App } from "../src/http/moonrock2-app.js";
import type { PostgresLaunchPlanRepository } from "../src/postgres-launch-plan-repository.js";

function mockRepository(foundingCount: number): PostgresLaunchPlanRepository {
  return {
    countFoundingSignups: () => Promise.resolve(foundingCount),
    recordSignup: () => Promise.resolve(),
  } as unknown as PostgresLaunchPlanRepository;
}

describe("GET /v1/launch-plan/status", () => {
  it("reports 503 when no launch plan repository is configured", async () => {
    const { app } = createMoonrock2App();
    const response = await app.request("http://localhost/v1/launch-plan/status");
    expect(response.status).toBe(503);
    const body = await response.json() as { code: string };
    expect(body.code).toBe("LAUNCH_PLAN_STATUS_UNAVAILABLE");
  });

  it("reports the remaining founding slots and current pricing when signups are below the limit", async () => {
    const { app } = createMoonrock2App({ launchPlanRepository: mockRepository(3) });
    const response = await app.request("http://localhost/v1/launch-plan/status");
    expect(response.status).toBe(200);
    const body = await response.json() as { remainingFoundingSlots: number; foundingSetupFeeUsd: number; standardSetupFeeUsd: number; monthlyFeeUsd: number };
    expect(body).toEqual({ remainingFoundingSlots: 7, foundingSetupFeeUsd: 0, standardSetupFeeUsd: 499, monthlyFeeUsd: 97 });
  });

  it("never reports a negative remaining count once founding signups exceed the limit", async () => {
    const { app } = createMoonrock2App({ launchPlanRepository: mockRepository(15) });
    const response = await app.request("http://localhost/v1/launch-plan/status");
    const body = await response.json() as { remainingFoundingSlots: number };
    expect(body.remainingFoundingSlots).toBe(0);
  });
});
