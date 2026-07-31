import { createHash } from "node:crypto";
import type { ModelAdapter } from "./adapters.js";
import type { ModelProposal, Session, VisitorMessage } from "./domain.js";
import type { KnowledgeRecord } from "./knowledge.js";
import { redactSensitiveText } from "./redaction.js";

export interface ModelSandboxConfig {
  enabled: boolean;
  provider: "openai";
  api: "responses";
  model: string;
  reasoningEffort: "low" | "medium" | "high";
  promptVersion: string;
  policyVersion: string;
  schemaVersion: string;
  secretReference: `secretref://${string}`;
  timeoutMs: number;
  maxRetries: number;
  maxConcurrency: number;
  maxRequestsPerMinute: number;
  maxEstimatedTokensPerMinute: number;
  maxInputChars: number;
  maxOutputTokens: number;
  circuitFailureThreshold: number;
  circuitCooldownMs: number;
}

export interface ResponsesRequest {
  model: string;
  instructions: string;
  input: Array<{
    role: "user";
    content: Array<{ type: "input_text"; text: string }>;
  }>;
  reasoning: { effort: "low" | "medium" | "high" };
  text: {
    format: {
      type: "json_schema";
      name: "nova_model_proposal";
      strict: true;
      schema: object;
    };
  };
  max_output_tokens: number;
  store: false;
  safety_identifier: string;
}

export type ResponsesTransportResult =
  | { status: "completed"; outputText: string }
  | { status: "refused"; refusal: string }
  | { status: "incomplete"; reason: string };

export interface ResponsesTransport {
  send(
    request: ResponsesRequest,
    options: { signal: AbortSignal },
  ): Promise<ResponsesTransportResult>;
}

export class ResponsesTransportError extends Error {
  constructor(readonly safeToRetry: boolean) {
    super("Responses transport failed");
    this.name = "ResponsesTransportError";
  }
}

export type ModelSandboxErrorCode =
  | "disabled"
  | "input_limit"
  | "concurrency_limit"
  | "rate_limit"
  | "token_budget"
  | "circuit_open"
  | "timeout"
  | "transport_failure"
  | "refusal"
  | "incomplete"
  | "invalid_json"
  | "invalid_contract";

export class ModelSandboxError extends Error {
  constructor(readonly code: ModelSandboxErrorCode) {
    super(`Model sandbox unavailable: ${code}`);
    this.name = "ModelSandboxError";
  }
}

interface WindowUsage {
  startedAt: number;
  requests: number;
  estimatedTokens: number;
}

export class OpenAIResponsesModelAdapter implements ModelAdapter {
  #active = 0;
  #failures = 0;
  #circuitOpenedAt: number | null = null;
  #usage: WindowUsage;

  constructor(
    private readonly config: ModelSandboxConfig,
    private readonly instructions: string,
    private readonly schema: object,
    private readonly validateProposal: (value: unknown) => ModelProposal,
    private readonly transport: ResponsesTransport,
    private readonly now: () => number = Date.now,
  ) {
    this.#usage = { startedAt: now(), requests: 0, estimatedTokens: 0 };
  }

  async propose(input: {
    session: Session;
    message: VisitorMessage;
    knowledge: KnowledgeRecord[];
  }): Promise<ModelProposal> {
    if (!this.config.enabled) throw new ModelSandboxError("disabled");
    if (input.message.text.length > this.config.maxInputChars) {
      throw new ModelSandboxError("input_limit");
    }
    this.#admit(input);
    this.#active += 1;
    try {
      const request = this.#buildRequest(input);
      let result: ResponsesTransportResult;
      try {
        result = await this.#sendWithSafeRetry(request);
      } catch (error) {
        this.#recordFailure();
        if (error instanceof ModelSandboxError) throw error;
        throw new ModelSandboxError("transport_failure");
      }
      if (result.status === "refused") {
        this.#recordFailure();
        throw new ModelSandboxError("refusal");
      }
      if (result.status === "incomplete") {
        this.#recordFailure();
        throw new ModelSandboxError("incomplete");
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(result.outputText);
      } catch {
        this.#recordFailure();
        throw new ModelSandboxError("invalid_json");
      }
      try {
        const proposal = this.validateProposal(parsed);
        this.#failures = 0;
        this.#circuitOpenedAt = null;
        return proposal;
      } catch {
        this.#recordFailure();
        throw new ModelSandboxError("invalid_contract");
      }
    } finally {
      this.#active -= 1;
    }
  }

  #admit(input: {
    session: Session;
    message: VisitorMessage;
    knowledge: KnowledgeRecord[];
  }): void {
    const now = this.now();
    if (this.#circuitOpenedAt !== null) {
      if (now - this.#circuitOpenedAt < this.config.circuitCooldownMs) {
        throw new ModelSandboxError("circuit_open");
      }
      this.#circuitOpenedAt = null;
      this.#failures = 0;
    }
    if (this.#active >= this.config.maxConcurrency) {
      throw new ModelSandboxError("concurrency_limit");
    }
    if (now - this.#usage.startedAt >= 60_000) {
      this.#usage = { startedAt: now, requests: 0, estimatedTokens: 0 };
    }
    if (this.#usage.requests >= this.config.maxRequestsPerMinute) {
      throw new ModelSandboxError("rate_limit");
    }
    const estimatedTokens = Math.ceil(
      (input.message.text.length +
        this.instructions.length +
        JSON.stringify(input.knowledge).length) /
        4,
    );
    if (
      this.#usage.estimatedTokens + estimatedTokens >
      this.config.maxEstimatedTokensPerMinute
    ) {
      throw new ModelSandboxError("token_budget");
    }
    this.#usage.requests += 1;
    this.#usage.estimatedTokens += estimatedTokens;
  }

  #buildRequest(input: {
    session: Session;
    message: VisitorMessage;
    knowledge: KnowledgeRecord[];
  }): ResponsesRequest {
    const safeMessage = redactSensitiveText(input.message.text).text;
    const safeKnowledge = input.knowledge.map((record) => ({
      sourceId: record.sourceId,
      version: record.version,
      section: record.section,
      content: record.content.slice(0, 4_000),
    }));
    return {
      model: this.config.model,
      instructions: this.instructions,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                RUNTIME_STATE: {
                  state: input.session.state,
                  disclosurePresented: input.session.disclosurePresented,
                  primaryIntent: input.session.primaryIntent,
                  secondaryIntents: input.session.secondaryIntents,
                  discoveryQuestionCount: input.session.discoveryQuestionCount,
                  consent: input.session.consent,
                  pendingAction: input.session.pendingAction,
                  promptVersion: this.config.promptVersion,
                  policyVersion: this.config.policyVersion,
                  schemaVersion: this.config.schemaVersion,
                },
                APPROVED_KNOWLEDGE: safeKnowledge,
                VISITOR_MESSAGE: safeMessage,
              }),
            },
          ],
        },
      ],
      reasoning: { effort: this.config.reasoningEffort },
      text: {
        format: {
          type: "json_schema",
          name: "nova_model_proposal",
          strict: true,
          schema: this.schema,
        },
      },
      max_output_tokens: this.config.maxOutputTokens,
      store: false,
      safety_identifier: createHash("sha256")
        .update(`nova-r1:${input.session.id}`)
        .digest("hex")
        .slice(0, 32),
    };
  }

  async #withTimeout(request: ResponsesRequest): Promise<ResponsesTransportResult> {
    const controller = new AbortController();
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        this.transport.send(request, { signal: controller.signal }),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new ModelSandboxError("timeout"));
          }, this.config.timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async #sendWithSafeRetry(
    request: ResponsesRequest,
  ): Promise<ResponsesTransportResult> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.#withTimeout(request);
      } catch (error) {
        if (
          !(error instanceof ResponsesTransportError) ||
          !error.safeToRetry ||
          attempt >= this.config.maxRetries
        ) {
          throw error;
        }
      }
    }
  }

  #recordFailure(): void {
    this.#failures += 1;
    if (this.#failures >= this.config.circuitFailureThreshold) {
      this.#circuitOpenedAt = this.now();
    }
  }
}
