import type { ExpectedAnswerKind } from "./conversation-normalizer.js";

export interface AnswerInterpretation {
  value: unknown;
  confidence: "high" | "low";
}

/**
 * Fallback disambiguation for a free-text discovery answer the fast,
 * deterministic parser in conversation-normalizer.ts could not classify.
 * Only invoked after that parser fails - never a replacement for it, since
 * the regex path is free, instant, and correct for the vast majority of
 * answers. This exists because keyword lists can never keep up with how
 * unpredictably real visitors phrase things.
 */
export interface AnswerInterpreter {
  interpret(input: { prompt: string; expectedKind: ExpectedAnswerKind; rawText: string }): Promise<AnswerInterpretation | undefined>;
}

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface GroqAnswerInterpreterOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

const SYSTEM_PROMPT = `You classify a visitor's free-text answer against one specific discovery question for Moonrock's Nova assistant.
Respond with ONLY a compact JSON object, no other text: {"understood": true|false, "value": <classified value>, "confidence": "high"|"low"}.

Rules:
- For a boolean question, value must be exactly true or false.
- For a select question, value must be exactly one of the provided options, verbatim.
- For a number question, value must be a plain number (no units, no text).
- If the answer does not actually address the question, is a question back, or is genuinely ambiguous, set "understood": false and omit "value".
- Never guess when the answer could plausibly mean the opposite of your first read - use "confidence":"low" for anything that is not clearly and directly responsive, and "confidence":"high" only when you are confident.
- Do not include any text outside the JSON object.`;

function describeExpectedKind(expectedKind: ExpectedAnswerKind): string {
  if (expectedKind.type === "boolean") return "ANSWER TYPE: boolean (true or false)";
  if (expectedKind.type === "number") return "ANSWER TYPE: number";
  return `ANSWER TYPE: select\nOPTIONS: ${expectedKind.options.join(", ")}`;
}

function isValidValue(expectedKind: ExpectedAnswerKind, value: unknown): boolean {
  if (expectedKind.type === "boolean") return typeof value === "boolean";
  if (expectedKind.type === "number") return typeof value === "number" && Number.isFinite(value);
  return typeof value === "string" && expectedKind.options.includes(value);
}

export class GroqAnswerInterpreter implements AnswerInterpreter {
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly options: GroqAnswerInterpreterOptions, private readonly fetchFn: FetchLike = fetch) {
    this.model = options.model ?? "openai/gpt-oss-120b";
    this.baseUrl = (options.baseUrl ?? "https://api.groq.com/openai/v1").replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? 6000;
  }

  async interpret(input: { prompt: string; expectedKind: ExpectedAnswerKind; rawText: string }): Promise<AnswerInterpretation | undefined> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const userPrompt = [
        `QUESTION: ${input.prompt}`,
        describeExpectedKind(input.expectedKind),
        `VISITOR'S ANSWER: ${input.rawText}`,
      ].join("\n");
      const response = await this.fetchFn(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { authorization: `Bearer ${this.options.apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          temperature: 0,
          max_completion_tokens: 80,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
        }),
        signal: controller.signal,
      });
      if (!response.ok) return undefined;
      const payload = await response.json() as { choices?: Array<{ message?: { content?: string | null } }> };
      const raw = payload.choices?.[0]?.message?.content?.trim();
      if (!raw) return undefined;
      const parsed = JSON.parse(raw) as { understood?: boolean; value?: unknown; confidence?: string };
      if (!parsed.understood || parsed.value === undefined) return undefined;
      if (!isValidValue(input.expectedKind, parsed.value)) return undefined;
      return { value: parsed.value, confidence: parsed.confidence === "high" ? "high" : "low" };
    } catch {
      return undefined;
    } finally {
      clearTimeout(timeout);
    }
  }
}
