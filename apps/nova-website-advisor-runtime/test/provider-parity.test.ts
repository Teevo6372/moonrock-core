import { afterEach, describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { AnthropicConversationGenerator } from "../src/anthropic-conversation-generator.js";
import { SessionGroundedNovaConversationEngine } from "../src/dynamic-conversation-engine.js";
import { GroqConversationGenerator } from "../src/groq-conversation-generator.js";
import type { DiscoverySessionState } from "../src/discovery-session.js";

/**
 * "Before/after parity" for the Groq -> Claude migration (playbook Section 8
 * build step 1): both providers, run through the same engine and fixtures,
 * must (a) actually produce a generated reply rather than silently falling
 * back, and (b) never state a price that isn't backed by real catalog data -
 * Groq via the pre-computed context it's handed, Claude via the tool-calling
 * architecture's guardrail. This exercises SessionGroundedNovaConversationEngine's
 * provider-agnostic contract, not the providers' own internals (see
 * groq-conversation-generator.test.ts / anthropic-conversation-generator.test.ts
 * for those). No live network calls - both transports are mocked.
 */

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

function preCompletionState(): DiscoverySessionState {
  return { path: "existing_business", completed: false, answers: { path: "existing_business", missedCallsPerMonth: 3 } };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("provider parity", () => {
  it("Groq: produces a generated reply, price-accurate to the real AI Employee catalog", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ finish_reason: "stop", message: { content: "This runs $749/month, our AI Workforce tier." } }] }),
    }));
    const engine = new SessionGroundedNovaConversationEngine(new GroqConversationGenerator({ apiKey: "test-key" }));
    const turn = await engine.respond(completedState(), "What would this cost?");
    expect(turn.mode).toBe("generated");
    expect(turn.answer).toBeTruthy();
    expect(turn.answer).toContain("$749/month");
  });

  it("Claude: produces a generated reply via a real tool-use round trip, price-accurate to the real AI Employee catalog", async () => {
    const create = vi.fn()
      .mockResolvedValueOnce({
        stop_reason: "tool_use",
        content: [{ type: "tool_use", id: "call_1", name: "build_flight_plan", input: {}, caller: { type: "direct" } }],
      } as unknown as Anthropic.Message)
      .mockResolvedValueOnce({
        stop_reason: "end_turn",
        content: [{ type: "text", text: "This runs $749/month, our AI Workforce tier.", citations: null }],
      } as unknown as Anthropic.Message);
    const client = { messages: { create } } as unknown as Anthropic;
    const engine = new SessionGroundedNovaConversationEngine(new AnthropicConversationGenerator({ apiKey: "test-key" }, client));
    const turn = await engine.respond(completedState(), "What would this cost?");
    expect(turn.mode).toBe("generated");
    expect(turn.answer).toBeTruthy();
    expect(turn.answer).toContain("$749/month");
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("both providers fall back gracefully (without throwing) when every generation attempt fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const groqEngine = new SessionGroundedNovaConversationEngine(new GroqConversationGenerator({ apiKey: "test-key" }));
    const groqTurn = await groqEngine.respond(preCompletionState(), "Tell me more.");
    expect(groqTurn.mode).toBe("grounded_fallback");

    const create = vi.fn().mockRejectedValue(new Error("network down"));
    const client = { messages: { create } } as unknown as Anthropic;
    const claudeEngine = new SessionGroundedNovaConversationEngine(new AnthropicConversationGenerator({ apiKey: "test-key" }, client));
    const claudeTurn = await claudeEngine.respond(preCompletionState(), "Tell me more.");
    expect(claudeTurn.mode).toBe("grounded_fallback");
  });

  it("both providers honor a human-handoff request without ever calling the generator", async () => {
    const fetchFn = vi.fn();
    vi.stubGlobal("fetch", fetchFn);
    const groqEngine = new SessionGroundedNovaConversationEngine(new GroqConversationGenerator({ apiKey: "test-key" }));
    const groqTurn = await groqEngine.respond(completedState(), "Can I talk to a real person?");
    expect(groqTurn.intent).toBe("human_handoff");
    expect(fetchFn).not.toHaveBeenCalled();

    const create = vi.fn();
    const client = { messages: { create } } as unknown as Anthropic;
    const claudeEngine = new SessionGroundedNovaConversationEngine(new AnthropicConversationGenerator({ apiKey: "test-key" }, client));
    const claudeTurn = await claudeEngine.respond(completedState(), "Can I talk to a real person?");
    expect(claudeTurn.intent).toBe("human_handoff");
    expect(create).not.toHaveBeenCalled();
  });
});
