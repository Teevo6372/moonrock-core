import type { NovaConversationGenerator } from "./dynamic-conversation-engine.js";

export interface GroqConversationGeneratorOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export class GroqConversationGenerator implements NovaConversationGenerator {
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly options: GroqConversationGeneratorOptions) {
    this.model = options.model ?? "openai/gpt-oss-120b";
    this.baseUrl = (options.baseUrl ?? "https://api.groq.com/openai/v1").replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? 12000;
  }

  async generate(input: { system: string; businessContext: Record<string, unknown>; question: string }): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.options.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.45,
          max_completion_tokens: 450,
          messages: [
            { role: "system", content: input.system },
            {
              role: "user",
              content: `BUSINESS CONTEXT\n${JSON.stringify(input.businessContext)}\n\nCUSTOMER SAID\n${input.question}`,
            },
          ],
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Groq request failed with ${response.status}`);
      const payload = await response.json() as { choices?: Array<{ message?: { content?: string | null } }> };
      const answer = payload.choices?.[0]?.message?.content?.trim();
      if (!answer) throw new Error("Groq returned an empty response");
      return answer;
    } finally {
      clearTimeout(timeout);
    }
  }
}
