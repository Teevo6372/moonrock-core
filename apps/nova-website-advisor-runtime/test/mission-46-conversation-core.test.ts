import { describe, expect, it } from "vitest";
import { appendConversationExchange, createDiscoverySession, MAX_CONVERSATION_HISTORY_TURNS } from "../src/discovery-session.js";
import { SessionGroundedNovaConversationEngine, type NovaConversationGenerator } from "../src/dynamic-conversation-engine.js";

describe("Mission 46 conversation core", () => {
  it("keeps bounded server-side visitor/Nova history", () => {
    let state = createDiscoverySession("existing_business");
    for (let index = 0; index < 20; index += 1) state = appendConversationExchange(state, `visitor ${index}`, `nova ${index}`);
    expect(state.conversationHistory).toHaveLength(MAX_CONVERSATION_HISTORY_TURNS);
    expect(state.conversationHistory?.at(-1)?.text).toBe("nova 19");
    expect(state.conversationHistory?.[0]?.text).not.toBe("visitor 0");
  });

  it("passes recent history into the live conversation generator", async () => {
    let capturedHistory: unknown[] = [];
    const generator: NovaConversationGenerator = {
      async generate(input) {
        capturedHistory = input.history;
        return "We were talking about missed evening calls.";
      },
    };
    let state = createDiscoverySession("existing_business");
    state = appendConversationExchange(state, "I run a pizza shop", "Got it. Tell me what gets messy.");
    state = appendConversationExchange(state, "We miss calls after 8", "That sounds like a coverage problem.");
    const engine = new SessionGroundedNovaConversationEngine(generator);
    const turn = await engine.respond(state, "Where were we?", { resuming: true, progressPercent: 50 });
    expect(turn.answer).toContain("missed evening calls");
    expect(capturedHistory).toHaveLength(4);
  });

  it("does not use the generic opening response when a session is resumed", async () => {
    let state = createDiscoverySession("startup");
    state = appendConversationExchange(state, "I'm opening a pizza parlor", "Great. What's the biggest launch concern?");
    const engine = new SessionGroundedNovaConversationEngine();
    const turn = await engine.respond(state, "continue", { resuming: true, progressPercent: 25 });
    expect(turn.answer).toContain("Welcome back");
    expect(turn.answer).not.toContain("Hey, I’m Nova. Give me the basics");
  });
});
