import type { DiscoveryConversationTurn } from "./discovery-session.js";
import type { NovaConversationGenerator } from "./dynamic-conversation-engine.js";
import { stripMarkdownArtifacts } from "./text-sanitizer.js";

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

  async generate(input: { system: string; businessContext: Record<string, unknown>; question: string; history: DiscoveryConversationTurn[] }): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const recentMessages = input.history.slice(-12).map((turn) => ({
        role: turn.role === "visitor" ? "user" as const : "assistant" as const,
        content: turn.text,
      }));
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { authorization: `Bearer ${this.options.apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.45,
          max_completion_tokens: 450,
          messages: [
            { role: "system", content: input.system },
            { role: "system", content: `BUSINESS CONTEXT\n${JSON.stringify(input.businessContext)}` },
            ...recentMessages,
            { role: "user", content: input.question },
          ],
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Groq request failed with ${response.status}`);
      const payload = await response.json() as { choices?: Array<{ message?: { content?: string | null } }> };
      const answer = payload.choices?.[0]?.message?.content?.trim();
      if (!answer) throw new Error("Groq returned an empty response");
      return stripMarkdownArtifacts(answer);
    } finally {
      clearTimeout(timeout);
    }
  }
}
