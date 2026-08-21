import { describe, expect, it } from "vitest";

import { normalizeDiscoveryAnswer } from "../src/conversation-normalizer.js";
import { restoreNovaDiscovery } from "../src/discovery-api-contract.js";
import type { DiscoverySessionState } from "../src/discovery-session.js";

describe("Mission 45 session continuity", () => {
  it("reconstructs the visible discovery response from stored runtime state", () => {
    const state: DiscoverySessionState = {
      path: "existing_business",
      completed: false,
      meaningfulTurns: 3,
      answers: {
        path: "existing_business",
        businessName: "Perry Pizza",
        industry: "pizza restaurant",
        businessChallenges: "missed calls and inconsistent follow-up",
      },
    };

    const response = restoreNovaDiscovery(state);

    expect(response.progress.answered).toBe(3);
    expect(response.completed).toBe(false);
    expect(response.nextQuestion).toBeDefined();
  });

  it("uses question-specific boolean clarification instead of the generic yes-no fallback", () => {
    const normalized = normalizeDiscoveryAnswer("appointmentsNeedManualScheduling", "it depends");

    expect(normalized.needsClarification).toBe(true);
    expect(normalized.clarification).toContain("scheduling piece specifically");
    expect(normalized.clarification).not.toContain("mostly yes, mostly no");
  });
});
