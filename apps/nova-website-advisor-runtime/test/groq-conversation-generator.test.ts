import { afterEach, describe, expect, it, vi } from "vitest";
import { GroqConversationGenerator } from "../src/groq-conversation-generator.js";

function mockFetchOnce(body: unknown) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => body }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GroqConversationGenerator", () => {
  it("drops a dangling final sentence when Groq reports the reply was cut off by the token budget", async () => {
    mockFetchOnce({
      choices: [
        {
          finish_reason: "length",
          message: { content: "Here is the plan. To get the ball rolling, I" },
        },
      ],
    });
    const generator = new GroqConversationGenerator({ apiKey: "test-key" });
    const answer = await generator.generate({ system: "sys", businessContext: {}, question: "q", history: [] });
    expect(answer).toBe("Here is the plan.");
  });

  it("returns the full reply untouched when Groq finishes normally", async () => {
    mockFetchOnce({
      choices: [
        {
          finish_reason: "stop",
          message: { content: "Here is the plan. To get the ball rolling, I'll send an onboarding link." },
        },
      ],
    });
    const generator = new GroqConversationGenerator({ apiKey: "test-key" });
    const answer = await generator.generate({ system: "sys", businessContext: {}, question: "q", history: [] });
    expect(answer).toBe("Here is the plan. To get the ball rolling, I'll send an onboarding link.");
  });
});
