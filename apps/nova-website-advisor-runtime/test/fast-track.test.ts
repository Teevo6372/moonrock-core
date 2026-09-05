import { describe, expect, it } from "vitest";
import { diagnoseBusiness, type DiagnosticInput } from "../src/diagnostic-engine.js";
import { evaluateFastTrack } from "../src/fast-track.js";

function input(overrides: Partial<DiagnosticInput> = {}): DiagnosticInput {
  return { path: "existing_business", ...overrides };
}

describe("evaluateFastTrack", () => {
  it("is not eligible when no trigger signal is present", () => {
    const result = evaluateFastTrack(input(), []);
    expect(result.fastTrackEligible).toBe(false);
    expect(result.targetTier).toBeNull();
    expect(result.reasons).toHaveLength(0);
    expect(result.openingOfferItemId).toBeNull();
  });

  it("fires on the existing direct-escalation mechanism (requestedCustomIntegrations > 2)", () => {
    const result = evaluateFastTrack(input({ requestedCustomIntegrations: 3 }), []);
    expect(result.fastTrackEligible).toBe(true);
    expect(result.targetTier).toBe("ai_employee");
  });

  it("fires on the existing direct-escalation mechanism (expectedVoiceMinutesPerMonth > 5000)", () => {
    const result = evaluateFastTrack(input({ expectedVoiceMinutesPerMonth: 6000 }), []);
    expect(result.fastTrackEligible).toBe(true);
  });

  it("fires on the existing direct-escalation mechanism (an escalation risk category)", () => {
    const result = evaluateFastTrack(input({ riskCategories: ["legal_advice"] }), []);
    expect(result.fastTrackEligible).toBe(true);
  });

  it("fires on the existing indirect mechanism (a multi_department bottleneck) and targets ai_workforce", () => {
    const result = evaluateFastTrack(input(), [{ id: "multi_department", score: 76, reason: "spans three or more functions" }]);
    expect(result.fastTrackEligible).toBe(true);
    expect(result.targetTier).toBe("ai_workforce");
  });

  it("fires on high agency client volume (new threshold, 50)", () => {
    expect(evaluateFastTrack(input({ numberOfClientsManaged: 51 }), []).fastTrackEligible).toBe(true);
    expect(evaluateFastTrack(input({ numberOfClientsManaged: 50 }), []).fastTrackEligible).toBe(false);
  });

  it("fires on a stated budget ceiling well above entry-tier norms (new threshold, $1000)", () => {
    expect(evaluateFastTrack(input({ budgetCeilingMonthlyUsd: 1001 }), []).fastTrackEligible).toBe(true);
    expect(evaluateFastTrack(input({ budgetCeilingMonthlyUsd: 1000 }), []).fastTrackEligible).toBe(false);
  });

  it("fires on role-replacement language and targets ai_employee", () => {
    const result = evaluateFastTrack(input({ businessChallenges: "We want to replace our receptionist with AI." }), []);
    expect(result.fastTrackEligible).toBe(true);
    expect(result.targetTier).toBe("ai_employee");
  });

  it("fires on team-of-agents language and targets ai_workforce", () => {
    const result = evaluateFastTrack(input({ businessChallenges: "We want a full AI team handling this." }), []);
    expect(result.fastTrackEligible).toBe(true);
    expect(result.targetTier).toBe("ai_workforce");
  });

  it("fires on multi-location language and targets ai_workforce", () => {
    const result = evaluateFastTrack(input({ businessChallenges: "We operate across 5 locations." }), []);
    expect(result.fastTrackEligible).toBe(true);
    expect(result.targetTier).toBe("ai_workforce");
  });

  it("does not duplicate reasons when the direct and indirect mechanisms both fire at once", () => {
    const result = evaluateFastTrack(
      input({ requestedCustomIntegrations: 3 }),
      [{ id: "multi_department", score: 76, reason: "spans three or more functions" }],
    );
    expect(result.reasons).toHaveLength(new Set(result.reasons).size);
    expect(result.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it("suggests crm_pipeline as the fast-track opener whenever eligible", () => {
    expect(evaluateFastTrack(input({ requestedCustomIntegrations: 3 }), []).openingOfferItemId).toBe("crm_pipeline");
  });
});

describe("computeDirectEscalationReasons refactor (behavior-preserving)", () => {
  it("leaves diagnoseBusiness's escalationReasons and autonomousCloseAllowed unchanged after the extraction", () => {
    const result = diagnoseBusiness(input({ requestedCustomIntegrations: 3, missedCallsPerMonth: 5 }));
    expect(result.escalationReasons).toEqual(["More than two custom integrations require solution review."]);
    expect(result.autonomousCloseAllowed).toBe(false);
  });
});
