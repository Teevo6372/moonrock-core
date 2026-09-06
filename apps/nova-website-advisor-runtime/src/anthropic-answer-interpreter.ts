import Anthropic from "@anthropic-ai/sdk";
import type { AnswerInterpretation, AnswerInterpreter } from "./answer-interpreter.js";
import { describeExpectedKind, isValidValue } from "./answer-interpreter.js";
import type { ExpectedAnswerKind } from "./conversation-normalizer.js";

export interface AnthropicAnswerInterpreterOptions {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
}

const SYSTEM_PROMPT = `You classify a visitor's free-text answer against one specific discovery question for Moonrock's Nova assistant. Call classify_answer with your classification - never respond with plain text.

Rules:
- For a boolean question, value must be exactly true or false.
- For a select question, value must be exactly one of the provided options, verbatim.
- For a number question, value must be a plain number (no units, no text).
- If the answer does not actually address the question, is a question back, or is genuinely ambiguous, set understood: false and omit value.
- Never guess when the answer could plausibly mean the opposite of your first read - use confidence:"low" for anything that is not clearly and directly responsive, and confidence:"high" only when you are confident.`;

// This tool is Claude's structured-output mechanism, not a real capability -
// the idiomatic Claude equivalent of Groq's response_format: json_object,
// forced via tool_choice so a plain-text reply is never possible.
const CLASSIFY_ANSWER_TOOL: Anthropic.Tool = {
  name: "classify_answer",
  description: "Classify the visitor's free-text answer against the expected answer type.",
  input_schema: {
    type: "object",
    properties: {
      understood: { type: "boolean" },
      value: {},
      confidence: { type: "string", enum: ["high", "low"] },
    },
    required: ["understood", "confidence"],
    additionalProperties: false,
  },
  strict: true,
};

/**
 * Note: tool_choice forcing a specific tool is supported on claude-sonnet-5
 * (the model this runs on) but not on every model family - don't migrate
 * this to a different model without re-checking that support.
 */
export class AnthropicAnswerInterpreter implements AnswerInterpreter {
  private readonly model: string;

  constructor(
    options: AnthropicAnswerInterpreterOptions,
    private readonly client: Anthropic = new Anthropic({ apiKey: options.apiKey, timeout: options.timeoutMs ?? 6000 }),
  ) {
    this.model = options.model ?? "claude-sonnet-5";
  }

  async interpret(input: { prompt: string; expectedKind: ExpectedAnswerKind; rawText: string }): Promise<AnswerInterpretation | undefined> {
    try {
      const userPrompt = [
        `QUESTION: ${input.prompt}`,
        describeExpectedKind(input.expectedKind),
        `VISITOR'S ANSWER: ${input.rawText}`,
      ].join("\n");
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 80,
        system: SYSTEM_PROMPT,
        tools: [CLASSIFY_ANSWER_TOOL],
        tool_choice: { type: "tool", name: "classify_answer" },
        messages: [{ role: "user", content: userPrompt }],
      });
      const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
      if (!toolUse) return undefined;
      const parsed = toolUse.input as { understood?: boolean; value?: unknown; confidence?: string };
      if (!parsed.understood || parsed.value === undefined) return undefined;
      if (!isValidValue(input.expectedKind, parsed.value)) return undefined;
      return { value: parsed.value, confidence: parsed.confidence === "high" ? "high" : "low" };
    } catch {
      return undefined;
    }
  }
}
