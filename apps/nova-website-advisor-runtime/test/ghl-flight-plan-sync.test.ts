import { describe, expect, it } from "vitest";
import { DEFAULT_GHL_FIELD_REGISTRY } from "../src/ghl-field-registry.js";
import { assertGhlFlightPlanSyncReady, executeGhlFlightPlanSync } from "../src/ghl-flight-plan-sync.js";

describe("GHL Flight Plan sync", () => {
  it("refuses writes until explicitly enabled", () => {
    expect(() => assertGhlFlightPlanSyncReady({ enabled: false, locationId: null, fieldsVerified: false, fieldRegistry: DEFAULT_GHL_FIELD_REGISTRY })).toThrow(/disabled/i);
  });

  it("uses deterministic idempotency keys when enabled", async () => {
    const calls: string[] = [];
    const result = await executeGhlFlightPlanSync({
      sessionId: "session-1",
      idempotencyKey: "moonrock2:flight-plan:session-1",
      autonomousCloseAllowed: true,
      operations: [{ kind: "add_tags", tags: ["moonrock-2"] }, { kind: "add_note", note: "Flight Plan generated." }],
    }, {
      enabled: true,
      locationId: "location-1",
      fieldsVerified: true,
      fieldRegistry: DEFAULT_GHL_FIELD_REGISTRY,
    }, {
      async execute(input) {
        calls.push(input.idempotencyKey);
        return { status: "confirmed", providerObjectId: `object-${calls.length}` };
      },
    });
    expect(result.completedOperations).toBe(2);
    expect(calls).toEqual(["moonrock2:flight-plan:session-1:1", "moonrock2:flight-plan:session-1:2"]);
  });
});
