import { describe, expect, it } from "vitest";
import { startNovaDiscovery, submitNovaDiscoveryAnswer } from "../src/discovery-api-contract.js";

describe("browser discovery and Flight Plan save boundary", () => {
  it("never makes identity a discovery requirement and produces a preliminary plan by four meaningful answers", async () => {
    let current = startNovaDiscovery("existing_business");
    expect(current.response.completed).toBe(false);
    expect(current.response.nextQuestion?.isFinalRequired).toBe(false);

    const answers: Array<["businessName" | "industry" | "businessChallenges" | "monthlyLeads", unknown]> = [
      ["businessName", "Mission 46 Browser Test"],
      ["industry", "Home Services"],
      ["businessChallenges", "We miss calls and follow-up gets delayed when the team is in the field."],
      ["monthlyLeads", 40],
    ];

    for (let index = 0; index < answers.length; index += 1) {
      const [field, value] = answers[index]!;
      current = await submitNovaDiscoveryAnswer(current.state, field, value);
      expect(current.response.nextQuestion?.isFinalRequired ?? false).toBe(false);
      if (index < 3) expect(current.response.completed).toBe(false);
    }

    expect(current.response.completed).toBe(true);
    expect(current.response.progress.requiredRemaining).toBe(0);
    expect(current.response.nextQuestion).toBeUndefined();
    expect(current.response.result?.flightPlan.status).toBe("preliminary");
  });
});
