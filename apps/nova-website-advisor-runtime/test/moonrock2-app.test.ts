import { describe, expect, it } from "vitest";
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
});
