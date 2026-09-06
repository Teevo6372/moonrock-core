import { describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { AnthropicConversationGenerator } from "../src/anthropic-conversation-generator.js";
import type { NovaToolContext } from "../src/anthropic-tools.js";
import type { DiscoverySessionState } from "../src/discovery-session.js";

function mockClient(...responses: Array<Partial<Anthropic.Message>>) {
  const create = vi.fn();
  for (const response of responses) create.mockResolvedValueOnce(response as Anthropic.Message);
  return { client: { messages: { create } } as unknown as Anthropic, create };
}

function text(value: string): Anthropic.TextBlock {
  return { type: "text", text: value, citations: null };
}

function toolUse(id: string, name: string, input: unknown): Anthropic.ToolUseBlock {
  return { type: "tool_use", id, name, input, caller: { type: "direct" } };
}

function toolContext(): NovaToolContext {
  const state: DiscoverySessionState = { path: "existing_business", completed: false, answers: { path: "existing_business" } };
  return { answers: state.answers, state };
}

function baseInput(overrides: Partial<Parameters<AnthropicConversationGenerator["generate"]>[0]> = {}) {
  return { system: "sys", businessContext: {}, question: "q", history: [], toolContext: toolContext(), ...overrides };
}

describe("AnthropicConversationGenerator", () => {
  it("returns the final text block untouched when Claude answers in one turn", async () => {
    const { client } = mockClient({ stop_reason: "end_turn", content: [text("Hey there, tell me more.")] });
    const generator = new AnthropicConversationGenerator({ apiKey: "test-key" }, client);
    const answer = await generator.generate(baseInput());
    expect(answer).toBe("Hey there, tell me more.");
  });

  it("caches the stable system block and keeps turn guidance out of it", async () => {
    const { client, create } = mockClient({ stop_reason: "end_turn", content: [text("ok")] });
    const generator = new AnthropicConversationGenerator({ apiKey: "test-key" }, client);
    await generator.generate(baseInput({ volatileSystemSuffix: "\n\nTURN GUIDANCE: opening" }));
    const requestArgs = create.mock.calls[0]![0] as Anthropic.MessageCreateParams;
    const system = requestArgs.system as Anthropic.TextBlockParam[];
    expect(system[0]!.text).toBe("sys");
    expect(system[0]!.cache_control).toEqual({ type: "ephemeral" });
    expect(system[1]!.text).toContain("TURN GUIDANCE");
    expect(system[1]!.cache_control).toBeUndefined();
  });

  it("executes a tool_use round trip: runs the tool, sends a tool_result back, and returns the follow-up text", async () => {
    const { client, create } = mockClient(
      { stop_reason: "tool_use", content: [toolUse("call_1", "get_business_diagnosis", {})] },
      { stop_reason: "end_turn", content: [text("Based on that, here's what I'd recommend.")] },
    );
    const generator = new AnthropicConversationGenerator({ apiKey: "test-key" }, client);
    const answer = await generator.generate(baseInput());
    expect(answer).toBe("Based on that, here's what I'd recommend.");
    expect(create).toHaveBeenCalledTimes(2);

    const secondCallMessages = (create.mock.calls[1]![0] as Anthropic.MessageCreateParams).messages;
    const assistantTurn = secondCallMessages[secondCallMessages.length - 2]!;
    const toolResultTurn = secondCallMessages[secondCallMessages.length - 1]!;
    expect(assistantTurn.role).toBe("assistant");
    expect(toolResultTurn.role).toBe("user");
    const toolResultBlock = (toolResultTurn.content as Anthropic.ToolResultBlockParam[])[0]!;
    expect(toolResultBlock.type).toBe("tool_result");
    expect(toolResultBlock.tool_use_id).toBe("call_1");
    expect(toolResultBlock.is_error).toBeUndefined();
  });

  it("sends all parallel tool_use blocks' results back in a single user message", async () => {
    const { client, create } = mockClient(
      {
        stop_reason: "tool_use",
        content: [toolUse("call_1", "get_catalog", { tier: "ai_employee" }), toolUse("call_2", "get_ascension_state", {})],
      },
      { stop_reason: "end_turn", content: [text("Here you go.")] },
    );
    const generator = new AnthropicConversationGenerator({ apiKey: "test-key" }, client);
    await generator.generate(baseInput());

    const secondCallMessages = (create.mock.calls[1]![0] as Anthropic.MessageCreateParams).messages;
    const toolResultTurn = secondCallMessages[secondCallMessages.length - 1]!;
    const blocks = toolResultTurn.content as Anthropic.ToolResultBlockParam[];
    expect(blocks).toHaveLength(2);
    expect(blocks.map((block) => block.tool_use_id)).toEqual(["call_1", "call_2"]);
  });

  it("sends an is_error tool_result when a tool throws, rather than crashing", async () => {
    const { client } = mockClient(
      { stop_reason: "tool_use", content: [toolUse("call_1", "not_a_real_tool", {})] },
      { stop_reason: "end_turn", content: [text("Let me try something else.")] },
    );
    const generator = new AnthropicConversationGenerator({ apiKey: "test-key" }, client);
    const answer = await generator.generate(baseInput());
    expect(answer).toBe("Let me try something else.");
  });

  it("throws after exceeding the max tool-call iteration cap rather than looping forever", async () => {
    const create = vi.fn().mockResolvedValue({ stop_reason: "tool_use", content: [toolUse("call_1", "get_ascension_state", {})] } as Anthropic.Message);
    const client = { messages: { create } } as unknown as Anthropic;
    const generator = new AnthropicConversationGenerator({ apiKey: "test-key", maxToolIterations: 3 }, client);
    await expect(generator.generate(baseInput())).rejects.toThrow(/tool-call iterations/);
    expect(create).toHaveBeenCalledTimes(3);
  });

  it("throws on a safety refusal instead of returning an empty/misleading answer", async () => {
    const { client } = mockClient({ stop_reason: "refusal", content: [] });
    const generator = new AnthropicConversationGenerator({ apiKey: "test-key" }, client);
    await expect(generator.generate(baseInput())).rejects.toThrow(/refusal/);
  });

  it("throws when Claude ends the turn with no text content", async () => {
    const { client } = mockClient({ stop_reason: "end_turn", content: [] });
    const generator = new AnthropicConversationGenerator({ apiKey: "test-key" }, client);
    await expect(generator.generate(baseInput())).rejects.toThrow(/no text content/);
  });

  it("truncates a dangling final sentence when Claude's reply is cut off by max_tokens, for parity with the Groq generator", async () => {
    const { client } = mockClient({ stop_reason: "max_tokens", content: [text("Here is the plan. To get the ball rolling, I")] });
    const generator = new AnthropicConversationGenerator({ apiKey: "test-key" }, client);
    const answer = await generator.generate(baseInput());
    expect(answer).toBe("Here is the plan.");
  });

  it("logs (but does not throw or alter) a reply containing an untraceable price", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { client } = mockClient({ stop_reason: "end_turn", content: [text("That'll run you $749/month.")] });
    const generator = new AnthropicConversationGenerator({ apiKey: "test-key" }, client);
    const answer = await generator.generate(baseInput());
    expect(answer).toBe("That'll run you $749/month.");
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
