import { describe, expect, it, vi } from "vitest";
import { SessionGroundedNovaConversationEngine } from "../src/dynamic-conversation-engine.js";
import type { NovaConversationGenerator } from "../src/dynamic-conversation-engine.js";
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

  it("regression: does not fall back to the pre-completion discovery question once a Flight Plan exists (this previously caused a repeating-question lockup when the LLM provider failed)", async () => {
    const engine = new SessionGroundedNovaConversationEngine();
    const turn = await engine.respond(completedState(), "I can't afford that much per month, can we look at something smaller?");
    expect(turn.answer).not.toContain("before I recommend a starting plan");
    expect(turn.answer).toContain("Flight Plan");
  });

  it("retries the generator once before falling back, so a single transient provider failure does not surface the fallback", async () => {
    const generate = vi.fn<NovaConversationGenerator["generate"]>()
      .mockRejectedValueOnce(new Error("Groq request failed with 429"))
      .mockResolvedValueOnce("Here's a smaller option that fits your budget.");
    const engine = new SessionGroundedNovaConversationEngine({ generate });
    const turn = await engine.respond(completedState(), "Something smaller?");
    expect(generate).toHaveBeenCalledTimes(2);
    expect(turn.mode).toBe("generated");
    expect(turn.answer).toBe("Here's a smaller option that fits your budget.");
  });

  it("falls back gracefully (without throwing) when the generator fails on every attempt", async () => {
    const generate = vi.fn<NovaConversationGenerator["generate"]>().mockRejectedValue(new Error("Groq request failed with 503"));
    const engine = new SessionGroundedNovaConversationEngine({ generate });
    const turn = await engine.respond(completedState(), "Something smaller?");
    expect(turn.mode).toBe("grounded_fallback");
    expect(turn.answer).toContain("Flight Plan");
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

describe("ascension funnel grounding in businessContext", () => {
  async function contextFromRespond(state: DiscoverySessionState, question = "Tell me more."): Promise<Record<string, unknown>> {
    const generate = vi.fn<NovaConversationGenerator["generate"]>().mockResolvedValue("ok");
    const engine = new SessionGroundedNovaConversationEngine({ generate });
    await engine.respond(state, question);
    return generate.mock.calls[0]![0].businessContext;
  }

  it("always grounds the LLM on the approved a-la-carte catalog", async () => {
    const context = await contextFromRespond(completedState());
    expect(Array.isArray(context.alaCarteCatalog)).toBe(true);
    expect((context.alaCarteCatalog as Array<{ name: string }>).some((item) => item.name === "CRM & Pipeline Management")).toBe(true);
  });

  it("never leaks the internal GHL-native-component note into the LLM prompt context", async () => {
    const context = await contextFromRespond(completedState());
    const serialized = JSON.stringify(context.alaCarteCatalog);
    expect(serialized).not.toContain("GHL");
    expect(serialized).not.toContain("ghlNativeComponentNote");
  });

  it("includes activeBundle only when a cross-tier bundle actually applies", async () => {
    const withoutSignal = await contextFromRespond(completedState());
    expect(withoutSignal.activeBundle).toBeUndefined();

    const websiteBuildState: DiscoverySessionState = {
      path: "existing_business",
      completed: false,
      answers: { path: "existing_business", hasExistingWebsite: false, websiteMustHaves: "We need a quote form on the new site." },
    };
    const withSignal = await contextFromRespond(websiteBuildState);
    expect(withSignal.activeBundle).toBeDefined();
  });

  it("includes fastTrack only when the visitor's signals are actually eligible", async () => {
    const plainState: DiscoverySessionState = { path: "existing_business", completed: false, answers: { path: "existing_business", missedCallsPerMonth: 3 } };
    const notEligible = await contextFromRespond(plainState);
    expect(notEligible.fastTrack).toBeUndefined();

    const eligibleState: DiscoverySessionState = {
      path: "existing_business",
      completed: false,
      answers: { path: "existing_business", businessChallenges: "We operate across 5 locations." },
    };
    const eligible = await contextFromRespond(eligibleState);
    expect(eligible.fastTrack).toBeDefined();
    expect((eligible.fastTrack as { fastTrackEligible: boolean }).fastTrackEligible).toBe(true);
  });

  it("keeps the grounded fallback price-accurate even when an active bundle exists in context", async () => {
    const engine = new SessionGroundedNovaConversationEngine();
    const turn = await engine.respond(completedState(), "What would this cost me?");
    expect(turn.mode).toBe("grounded_fallback");
    expect(turn.answer).toContain("$749/month");
  });
});
