import { describe, expect, it } from "vitest";
import { SessionGroundedNovaConversationEngine } from "../src/dynamic-conversation-engine.js";
import { normalizeDiscoveryAnswer } from "../src/conversation-normalizer.js";
import type { DiscoverySessionState } from "../src/discovery-session.js";

function completedState(): DiscoverySessionState {
  return {
    path: "existing_business",
    completed: true,
    answers: {
      path: "existing_business",
      businessName: "Prairie Service Co",
      industry: "home services",
      businessChallenges: "We miss evening calls and follow-up can get delayed.",
      monthlyLeads: 40,
      missedCallsPerMonth: 8,
      medianLeadResponseMinutes: 45,
      averageJobValueUsd: 1200,
      closeRatePercent: 30,
      appointmentsNeedManualScheduling: true,
      estimatesNeedManualFollowUp: true,
      repetitiveSupportLoad: "medium",
      dormantCustomerList: true,
      departmentsAffected: 3,
    },
  };
}

describe("SessionGroundedNovaConversationEngine", () => {
  it("answers pricing questions from the completed Flight Plan context", async () => {
    const engine = new SessionGroundedNovaConversationEngine();
    const turn = await engine.respond(completedState(), "What would this cost me?");
    expect(turn.mode).toBe("grounded_fallback");
    expect(turn.answer).toContain("Prairie Service Co");
    expect(turn.answer).toContain("$749/month");
    expect(turn.answer).toContain("$1499");
  });

  it("keeps implementation answers grounded without exposing vendor names", async () => {
    const engine = new SessionGroundedNovaConversationEngine();
    const turn = await engine.respond(completedState(), "How would implementation work?");
    expect(turn.answer).toContain("validating the workflow");
    expect(turn.answer).toContain("vendor stack");
  });
});

describe("conversational clarification", () => {
  it("does not convert an unparseable required scope answer into zero", () => {
    const normalized = normalizeDiscoveryAnswer("departmentsAffected", "It kind of touches everything in different ways");
    expect(normalized.needsClarification).toBe(true);
    expect(normalized.value).not.toBe(0);
  });

  it("can count named business areas from conversational context", () => {
    const normalized = normalizeDiscoveryAnswer("departmentsAffected", "sales, support and admin");
    expect(normalized.value).toBe(3);
    expect(normalized.interpreted).toBe(true);
  });
});
