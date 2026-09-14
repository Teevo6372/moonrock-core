import { describe, expect, it } from "vitest";
import { flightPlanSaveAnswer } from "../src/discovery-router.js";
import type { ProductionGhlHandoffResult } from "../src/ghl-production-handoff.js";

function result(overrides: Partial<ProductionGhlHandoffResult>): ProductionGhlHandoffResult {
  return { status: "confirmed", autonomousCloseAllowed: false, followUpEnabled: false, deferredOperations: [], ...overrides };
}

describe("flightPlanSaveAnswer", () => {
  it("tells the visitor to keep going with Nova when the offer is zero-touch", () => {
    const answer = flightPlanSaveAnswer(result({ autonomousCloseAllowed: true, followUpEnabled: false }));
    expect(answer).toMatch(/without extra steps/i);
    expect(answer).toMatch(/let nova know/i);
  });

  it("promises a rep follow-up only when the offer needs a human AND the visitor consented", () => {
    const answer = flightPlanSaveAnswer(result({ autonomousCloseAllowed: false, followUpEnabled: true }));
    expect(answer).toMatch(/a moonrock rep will reach out/i);
  });

  it("does not promise a rep follow-up when the offer needs a human but the visitor did not opt in", () => {
    const answer = flightPlanSaveAnswer(result({ autonomousCloseAllowed: false, followUpEnabled: false }));
    expect(answer).not.toMatch(/will reach out/i);
    expect(answer).toMatch(/review by our team/i);
  });

  it("autonomousCloseAllowed wins over followUpEnabled - zero-touch offers never get the rep-outreach message", () => {
    const answer = flightPlanSaveAnswer(result({ autonomousCloseAllowed: true, followUpEnabled: true }));
    expect(answer).toMatch(/without extra steps/i);
  });

  it("falls back to the disabled-writes message for a dry run, regardless of the other flags", () => {
    const answer = flightPlanSaveAnswer(result({ status: "dry_run", autonomousCloseAllowed: true, followUpEnabled: true }));
    expect(answer).toMatch(/live CRM writes are currently disabled/i);
  });
});
