import { describe, expect, it } from "vitest";
import { startNovaDiscovery, submitNovaDiscoveryAnswer } from "../src/discovery-api-contract.js";

describe("browser GHL handoff discovery contract", () => {
  it("marks only the last required question as the identity handoff boundary", () => {
    let current = startNovaDiscovery("existing_business");
    expect(current.response.progress.requiredRemaining).toBe(6);
    expect(current.response.nextQuestion?.isFinalRequired).toBe(false);

    const answers: Array<[string, unknown]> = [
      ["businessName", "Mission 20 Browser Test"],
      ["industry", "Home Services"],
      ["monthlyLeads", 40],
      ["appointmentsNeedManualScheduling", true],
      ["estimatesNeedManualFollowUp", true],
      ["repetitiveSupportLoad", "medium"],
      ["reviewRequestProcess", "manual"],
      ["requestedCustomIntegrations", 0],
      ["expectedVoiceMinutesPerMonth", 240],
      ["missedCallsPerMonth", 0],
      ["medianLeadResponseMinutes", 18],
    ];

    for (const [field, value] of answers) {
      current = submitNovaDiscoveryAnswer(current.state, field as never, value);
    }

    expect(current.response.completed).toBe(false);
    expect(current.response.progress.requiredRemaining).toBe(1);
    expect(current.response.nextQuestion?.field).toBe("dormantCustomerList");
    expect(current.response.nextQuestion?.required).toBe(true);
    expect(current.response.nextQuestion?.isFinalRequired).toBe(true);

    current = submitNovaDiscoveryAnswer(current.state, "dormantCustomerList", true);
    expect(current.response.completed).toBe(true);
    expect(current.response.progress.requiredRemaining).toBe(0);
    expect(current.response.nextQuestion).toBeUndefined();
  });
});
