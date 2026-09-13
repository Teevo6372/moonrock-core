import { describe, expect, it } from "vitest";
import { createMoonrock2App } from "../src/http/moonrock2-app.js";

describe("POST /v1/contact", () => {
  async function post(app: ReturnType<typeof createMoonrock2App>["app"], body: unknown) {
    const response = await app.request("http://localhost/v1/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: response.status, json: (await response.json()) as any };
  }

  it("reports unavailable when GHL is not configured", async () => {
    const { app } = createMoonrock2App({});
    const result = await post(app, { name: "Jane Doe", email: "jane@example.com", message: "Hello" });
    expect(result.status).toBe(503);
    expect(result.json.code).toBe("CONTACT_FORM_UNAVAILABLE");
  });

  it("rejects a submission missing required fields", async () => {
    const { app } = createMoonrock2App({
      contactGhl: { enabled: true, writesEnabled: false, locationId: "dry-run-location", accessToken: "dry-run-token" },
    });
    const result = await post(app, { name: "", email: "jane@example.com", message: "Hello" });
    expect(result.status).toBe(400);
    expect(result.json.code).toBe("CONTACT_FORM_INVALID");
  });

  it("dry-runs a valid submission without a real CRM write", async () => {
    const { app } = createMoonrock2App({
      contactGhl: { enabled: true, writesEnabled: false, locationId: "dry-run-location", accessToken: "dry-run-token" },
    });
    const result = await post(app, { name: "Jane Doe", email: "jane@example.com", message: "Interested in AI Employees." });
    expect(result.status).toBe(200);
    expect(result.json.status).toBe("dry_run");
    expect(result.json.answer).toMatch(/live CRM writes are currently disabled/i);
  });
});
