import { describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { AnthropicAnswerInterpreter } from "../src/anthropic-answer-interpreter.js";

function toolUseResponse(input: unknown): Anthropic.Message {
  return { content: [{ type: "tool_use", id: "call_1", name: "classify_answer", input, caller: { type: "direct" } }] } as unknown as Anthropic.Message;
}

function mockClient(response: Anthropic.Message) {
  const create = vi.fn().mockResolvedValue(response);
  return { client: { messages: { create } } as unknown as Anthropic, create };
}

describe("AnthropicAnswerInterpreter", () => {
  it("returns the classified boolean value when Claude understands the answer", async () => {
    const { client, create } = mockClient(toolUseResponse({ understood: true, value: true, confidence: "high" }));
    const interpreter = new AnthropicAnswerInterpreter({ apiKey: "test-key" }, client);
    const result = await interpreter.interpret({ prompt: "Will most admin land on you?", expectedKind: { type: "boolean" }, rawText: "I'll handle most of those tasks." });
    expect(result).toEqual({ value: true, confidence: "high" });

    const requestArgs = create.mock.calls[0]![0] as Anthropic.MessageCreateParams;
    expect(requestArgs.tool_choice).toEqual({ type: "tool", name: "classify_answer" });
  });

  it("returns undefined when Claude reports it did not understand the answer", async () => {
    const { client } = mockClient(toolUseResponse({ understood: false }));
    const interpreter = new AnthropicAnswerInterpreter({ apiKey: "test-key" }, client);
    const result = await interpreter.interpret({ prompt: "Do you have a website?", expectedKind: { type: "boolean" }, rawText: "What's a website?" });
    expect(result).toBeUndefined();
  });

  it("rejects a select value that is not one of the given options", async () => {
    const { client } = mockClient(toolUseResponse({ understood: true, value: "not_an_option", confidence: "high" }));
    const interpreter = new AnthropicAnswerInterpreter({ apiKey: "test-key" }, client);
    const result = await interpreter.interpret({ prompt: "How many pages?", expectedKind: { type: "select", options: ["landing_page", "multi_page", "ecommerce"] }, rawText: "a few" });
    expect(result).toBeUndefined();
  });

  it("rejects a boolean-typed value that isn't actually a boolean", async () => {
    const { client } = mockClient(toolUseResponse({ understood: true, value: "true", confidence: "high" }));
    const interpreter = new AnthropicAnswerInterpreter({ apiKey: "test-key" }, client);
    const result = await interpreter.interpret({ prompt: "Will most admin land on you?", expectedKind: { type: "boolean" }, rawText: "yep that's me" });
    expect(result).toBeUndefined();
  });

  it("returns undefined when no tool_use block comes back rather than throwing", async () => {
    const { client } = mockClient({ content: [{ type: "text", text: "sorry, I can't help", citations: null }] } as unknown as Anthropic.Message);
    const interpreter = new AnthropicAnswerInterpreter({ apiKey: "test-key" }, client);
    const result = await interpreter.interpret({ prompt: "Do you have a website?", expectedKind: { type: "boolean" }, rawText: "hard to say" });
    expect(result).toBeUndefined();
  });

  it("returns undefined when the API call itself rejects (network error, timeout) rather than throwing", async () => {
    const create = vi.fn().mockRejectedValue(new Error("network down"));
    const client = { messages: { create } } as unknown as Anthropic;
    const interpreter = new AnthropicAnswerInterpreter({ apiKey: "test-key" }, client);
    const result = await interpreter.interpret({ prompt: "Do you have a website?", expectedKind: { type: "boolean" }, rawText: "hmm" });
    expect(result).toBeUndefined();
  });
});
