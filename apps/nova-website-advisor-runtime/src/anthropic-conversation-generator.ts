import Anthropic from "@anthropic-ai/sdk";
import { executeNovaTool, NOVA_TOOL_DEFINITIONS, type NovaToolContext } from "./anthropic-tools.js";
import type { DiscoveryConversationTurn } from "./discovery-session.js";
import type { NovaConversationGenerator } from "./dynamic-conversation-engine.js";
import { verifyPriceProvenance } from "./price-provenance-guardrail.js";
import { stripDisallowedThirdPartyMentions, stripMarkdownArtifacts, truncateToLastCompleteSentence } from "./text-sanitizer.js";

export interface AnthropicConversationGeneratorOptions {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
  maxToolIterations?: number;
}

export class AnthropicConversationGenerator implements NovaConversationGenerator {
  readonly usesToolCalling = true as const;
  private readonly model: string;
  private readonly maxToolIterations: number;

  constructor(
    options: AnthropicConversationGeneratorOptions,
    private readonly client: Anthropic = new Anthropic({ apiKey: options.apiKey, timeout: options.timeoutMs ?? 20000 }),
  ) {
    this.model = options.model ?? "claude-sonnet-5";
    this.maxToolIterations = options.maxToolIterations ?? 6;
  }

  async generate(input: {
    system: string;
    businessContext: Record<string, unknown>;
    question: string;
    history: DiscoveryConversationTurn[];
    toolContext: NovaToolContext;
    volatileSystemSuffix?: string;
  }): Promise<string> {
    const messages: Anthropic.MessageParam[] = [
      ...input.history.slice(-12).map((turn) => ({ role: turn.role === "visitor" ? ("user" as const) : ("assistant" as const), content: turn.text })),
      { role: "user", content: `BUSINESS CONTEXT\n${JSON.stringify(input.businessContext)}\n\nVISITOR: ${input.question}` },
    ];
    const toolResultsThisTurn: unknown[] = [];
    // Two-block system: the stable persona/rules/addendum text is cached
    // (cache_control), the turn-varying guidance text rides after it,
    // uncached, so appending different guidance every turn doesn't
    // invalidate the cached prefix.
    const system: Anthropic.TextBlockParam[] = [{ type: "text", text: input.system, cache_control: { type: "ephemeral" } }];
    if (input.volatileSystemSuffix?.trim()) system.push({ type: "text", text: input.volatileSystemSuffix });

    for (let iteration = 0; iteration < this.maxToolIterations; iteration += 1) {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        system,
        tools: NOVA_TOOL_DEFINITIONS,
        messages,
      });

      if (response.stop_reason === "tool_use" || response.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: response.content });
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type !== "tool_use") continue;
          try {
            const result = executeNovaTool(block.name, block.input, input.toolContext);
            toolResultsThisTurn.push(result);
            toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
          } catch (error) {
            toolResults.push({ type: "tool_result", tool_use_id: block.id, content: error instanceof Error ? error.message : "tool execution failed", is_error: true });
          }
        }
        if (toolResults.length > 0) messages.push({ role: "user", content: toolResults });
        continue;
      }

      if (response.stop_reason === "refusal") {
        throw new Error("Claude declined to answer (safety refusal)");
      }

      const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === "text");
      let rawAnswer = textBlock?.text?.trim();
      if (!rawAnswer) throw new Error("Claude returned no text content");
      if (response.stop_reason === "max_tokens") rawAnswer = truncateToLastCompleteSentence(rawAnswer);
      const answer = stripDisallowedThirdPartyMentions(stripMarkdownArtifacts(rawAnswer));

      const violations = verifyPriceProvenance(answer, toolResultsThisTurn);
      if (violations.length > 0) {
        console.warn(`[nova-conversation:anthropic] untraceable price/offer reference(s) in reply: ${violations.join("; ")}`);
      }
      return answer;
    }
    throw new Error(`Claude did not produce a final answer within ${this.maxToolIterations} tool-call iterations`);
  }
}
