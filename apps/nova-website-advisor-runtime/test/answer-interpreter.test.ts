import { describe, expect, it, vi } from "vitest";

import { GroqAnswerInterpreter, type AnswerInterpreter } from "../src/answer-interpreter.js";
import { normalizeDiscoveryAnswer } from "../src/conversation-normalizer.js";
import { submitNovaDiscoveryAnswer } from "../src/discovery-api-contract.js";
import { createDiscoverySession } from "../src/discovery-session.js";

function groqResponse(body: unknown, ok = true, status = 200): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(body) } }] }), { status: ok ? status : 500 });
}

describe("GroqAnswerInterpreter", () => {
  it("returns the classified boolean value when the model understands the answer", async () => {
    const fetchFn = vi.fn().mockResolvedValue(groqResponse({ understood: true, value: true, confidence: "high" }));
    const interpreter = new GroqAnswerInterpreter({ apiKey: "test-key" }, fetchFn as unknown as typeof fetch);
    const result = await interpreter.interpret({ prompt: "Will most admin land on you?", expectedKind: { type: "boolean" }, rawText: "I'll handle most of those tasks." });
    expect(result).toEqual({ value: true, confidence: "high" });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { temperature: number; response_format: { type: string } };
    expect(body.temperature).toBe(0);
    expect(body.response_format.type).toBe("json_object");
  });

  it("returns undefined when the model reports it did not understand the answer", async () => {
    const fetchFn = vi.fn().mockResolvedValue(groqResponse({ understood: false }));
    const interpreter = new GroqAnswerInterpreter({ apiKey: "test-key" }, fetchFn as unknown as typeof fetch);
    const result = await interpreter.interpret({ prompt: "Do you have a website?", expectedKind: { type: "boolean" }, rawText: "What's a website?" });
    expect(result).toBeUndefined();
  });

  it("rejects a select value the model returns that is not one of the given options", async () => {
    const fetchFn = vi.fn().mockResolvedValue(groqResponse({ understood: true, value: "not_an_option", confidence: "high" }));
    const interpreter = new GroqAnswerInterpreter({ apiKey: "test-key" }, fetchFn as unknown as typeof fetch);
    const result = await interpreter.interpret({ prompt: "How many pages?", expectedKind: { type: "select", options: ["landing_page", "multi_page", "ecommerce"] }, rawText: "a few" });
    expect(result).toBeUndefined();
  });

  it("rejects a boolean-typed value that isn't actually a boolean", async () => {
    const fetchFn = vi.fn().mockResolvedValue(groqResponse({ understood: true, value: "true", confidence: "high" }));
    const interpreter = new GroqAnswerInterpreter({ apiKey: "test-key" }, fetchFn as unknown as typeof fetch);
    const result = await interpreter.interpret({ prompt: "Will most admin land on you?", expectedKind: { type: "boolean" }, rawText: "yep that's me" });
    expect(result).toBeUndefined();
  });

  it("returns undefined on a non-ok HTTP response rather than throwing", async () => {
    const fetchFn = vi.fn().mockResolvedValue(groqResponse({}, false));
    const interpreter = new GroqAnswerInterpreter({ apiKey: "test-key" }, fetchFn as unknown as typeof fetch);
    const result = await interpreter.interpret({ prompt: "Do you have a website?", expectedKind: { type: "boolean" }, rawText: "no idea" });
    expect(result).toBeUndefined();
  });

  it("returns undefined when the model's content is not valid JSON rather than throwing", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "not json" } }] }), { status: 200 }));
    const interpreter = new GroqAnswerInterpreter({ apiKey: "test-key" }, fetchFn as unknown as typeof fetch);
    const result = await interpreter.interpret({ prompt: "Do you have a website?", expectedKind: { type: "boolean" }, rawText: "hard to say" });
    expect(result).toBeUndefined();
  });

  it("returns undefined when fetch itself rejects (network error, timeout) rather than throwing", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("network down"));
    const interpreter = new GroqAnswerInterpreter({ apiKey: "test-key" }, fetchFn as unknown as typeof fetch);
    const result = await interpreter.interpret({ prompt: "Do you have a website?", expectedKind: { type: "boolean" }, rawText: "hmm" });
    expect(result).toBeUndefined();
  });
});

class FakeAnswerInterpreter implements AnswerInterpreter {
  constructor(private readonly response: { value: unknown; confidence: "high" | "low" } | undefined) {}
  async interpret(): Promise<{ value: unknown; confidence: "high" | "low" } | undefined> {
    return this.response;
  }
}

describe("submitNovaDiscoveryAnswer with an answer interpreter", () => {
  it("advances the session using the interpreter's value when the regex parser cannot classify the answer", async () => {
    const start = createDiscoverySession("startup");
    const genuinelyAmbiguousText = "My cofounder and I split things, not sure how to characterize it exactly.";
    expect(normalizeDiscoveryAnswer("founderHandlesMostAdmin", genuinelyAmbiguousText).needsClarification).toBe(true);
    const interpreter = new FakeAnswerInterpreter({ value: true, confidence: "high" });
    const result = await submitNovaDiscoveryAnswer(start, "founderHandlesMostAdmin", genuinelyAmbiguousText, interpreter);
    expect(result.response.clarification).toBeUndefined();
    expect(result.state.answers.founderHandlesMostAdmin).toBe(true);
    expect(result.response.interpretation?.note).toContain("AI-assisted interpretation");
  });

  it("falls back to the normal clarification prompt when the interpreter also cannot classify the answer", async () => {
    const start = createDiscoverySession("startup");
    const interpreter = new FakeAnswerInterpreter(undefined);
    const result = await submitNovaDiscoveryAnswer(start, "founderHandlesMostAdmin", "hard to say honestly", interpreter);
    expect(result.response.clarification).toBeDefined();
    expect(result.state.answers.founderHandlesMostAdmin).toBeUndefined();
  });

  it("preserves today's clarification behavior when no interpreter is configured at all", async () => {
    const start = createDiscoverySession("startup");
    const result = await submitNovaDiscoveryAnswer(start, "founderHandlesMostAdmin", "I'll handle most of those tasks.");
    // Sanity check: this exact phrase is independently fixed at the regex layer (see service-tiers.test.ts),
    // so without an interpreter it should already succeed via normalizeDiscoveryAnswer alone.
    expect(normalizeDiscoveryAnswer("founderHandlesMostAdmin", "I'll handle most of those tasks.").needsClarification).toBeUndefined();
    expect(result.response.clarification).toBeUndefined();
    expect(result.state.answers.founderHandlesMostAdmin).toBe(true);
  });

  it("does not call the interpreter at all when the regex parser already succeeded", async () => {
    const start = createDiscoverySession("startup");
    const interpretSpy = vi.fn().mockResolvedValue({ value: false, confidence: "high" });
    const interpreter: AnswerInterpreter = { interpret: interpretSpy };
    await submitNovaDiscoveryAnswer(start, "founderHandlesMostAdmin", "Yes, mostly me.", interpreter);
    expect(interpretSpy).not.toHaveBeenCalled();
  });
});
