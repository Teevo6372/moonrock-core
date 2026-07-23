import { describe, expect, it } from "vitest";
import { createHealthStatus } from "./health";

describe("createHealthStatus", () => {
  it("returns a deterministic healthy response", () => {
    const now = new Date("2026-07-22T12:00:00.000Z");
    expect(createHealthStatus(now)).toEqual({
      status: "ok",
      service: "Moonrock Commerce OS",
      environment: "development",
      timestamp: "2026-07-22T12:00:00.000Z",
    });
  });
});
