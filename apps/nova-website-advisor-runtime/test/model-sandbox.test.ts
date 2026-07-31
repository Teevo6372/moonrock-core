import { describe, expect, it, vi } from "vitest";
import {
  InMemorySessionStore,
  ModelReleaseValidationError,
  ModelSandboxError,
  OpenAIResponsesModelAdapter,
  ResponsesTransportError,
  createModelProposalValidator,
  validateModelReleaseManifest,
  type ModelReleaseManifest,
  type ModelSandboxConfig,
  type ResponsesRequest,
  type ResponsesTransport,
  type ResponsesTransportResult,
} from "../src/index.js";
import { knowledgeRepository, loadModelSchema, proposal } from "./fixtures.js";

const config: ModelSandboxConfig = {
  enabled: true,
  provider: "openai",
  api: "responses",
  model: "gpt-5.6-terra",
  reasoningEffort: "low",
  promptVersion: "nova-web-prompt-1.0.0-candidate",
  policyVersion: "nova-web-policy-1.0.0",
  schemaVersion: "nova-model-output-1.0.0",
  secretReference: "secretref://nova/staging/openai-api-key",
  timeoutMs: 100,
  maxRetries: 1,
  maxConcurrency: 2,
  maxRequestsPerMinute: 30,
  maxEstimatedTokensPerMinute: 60_000,
  maxInputChars: 12_000,
  maxOutputTokens: 1_500,
  circuitFailureThreshold: 3,
  circuitCooldownMs: 30_000,
};

function message(text = "Help me launch my business") {
  return {
    messageId: crypto.randomUUID(),
    sequence: 1,
    text,
    pagePath: "/",
    locale: "en-US",
    timeZone: "America/Chicago",
  };
}

function adapter(
  send: ResponsesTransport["send"],
  overrides: Partial<ModelSandboxConfig> = {},
  now?: () => number,
) {
  return new OpenAIResponsesModelAdapter(
    { ...config, ...overrides },
    "Follow the approved Nova instruction hierarchy.",
    loadModelSchema(),
    createModelProposalValidator(loadModelSchema()),
    { send },
    now,
  );
}

function validResult(): ResponsesTransportResult {
  return { status: "completed", outputText: JSON.stringify(proposal()) };
}

function input(text?: string) {
  return {
    session: new InMemorySessionStore().create(),
    message: message(text),
    knowledge: knowledgeRepository().find("LAUNCH"),
  };
}

describe("OpenAI Responses model sandbox", () => {
  it("builds a non-stored strict-schema request with an exact model", async () => {
    let captured: ResponsesRequest | undefined;
    const model = adapter(async (request) => {
      captured = request;
      return validResult();
    });
    await model.propose(input());
    expect(captured).toMatchObject({
      model: "gpt-5.6-terra",
      store: false,
      reasoning: { effort: "low" },
      text: {
        format: {
          type: "json_schema",
          name: "nova_model_proposal",
          strict: true,
        },
      },
      max_output_tokens: 1_500,
    });
    expect(captured).not.toHaveProperty("tools");
  });

  it("uses a stable pseudonymous safety identifier", async () => {
    const identifiers: string[] = [];
    const model = adapter(async (request) => {
      identifiers.push(request.safety_identifier);
      return validResult();
    });
    const requestInput = input();
    await model.propose(requestInput);
    await model.propose({ ...requestInput, message: message("A second question") });
    expect(identifiers[0]).toBe(identifiers[1]);
    expect(identifiers[0]).not.toContain(requestInput.session.id);
  });

  it("redacts sensitive visitor content before transport", async () => {
    let body = "";
    const model = adapter(async (request) => {
      body = request.input[0]?.content[0]?.text ?? "";
      return validResult();
    });
    await model.propose(input("api_key=super-secret-value"));
    expect(body).toContain("[REDACTED_SECRET]");
    expect(body).not.toContain("super-secret-value");
  });

  it("returns only contract-valid proposals", async () => {
    const model = adapter(async () => validResult());
    await expect(model.propose(input())).resolves.toEqual(proposal());
  });

  it.each([
    [{ status: "refused", refusal: "policy" }, "refusal"],
    [{ status: "incomplete", reason: "max_output_tokens" }, "incomplete"],
    [{ status: "completed", outputText: "not json" }, "invalid_json"],
    [{ status: "completed", outputText: "{}" }, "invalid_contract"],
  ] as const)("fails closed for %s", async (result, code) => {
    const model = adapter(async () => result);
    await expect(model.propose(input())).rejects.toMatchObject({ code });
  });

  it("times out and aborts a stalled request", async () => {
    let aborted = false;
    const model = adapter(
      async (_request, { signal }) =>
        new Promise((resolve) => {
          signal.addEventListener("abort", () => {
            aborted = true;
            resolve(validResult());
          });
        }),
      { timeoutMs: 5 },
    );
    await expect(model.propose(input())).rejects.toMatchObject({ code: "timeout" });
    expect(aborted).toBe(true);
  });

  it("retries only explicitly safe transport failures", async () => {
    const send = vi
      .fn<ResponsesTransport["send"]>()
      .mockRejectedValueOnce(new ResponsesTransportError(true))
      .mockResolvedValueOnce(validResult());
    await expect(adapter(send).propose(input())).resolves.toEqual(proposal());
    expect(send).toHaveBeenCalledTimes(2);

    const unknown = vi.fn<ResponsesTransport["send"]>().mockRejectedValue(
      new ResponsesTransportError(false),
    );
    await expect(adapter(unknown).propose(input())).rejects.toMatchObject({
      code: "transport_failure",
    });
    expect(unknown).toHaveBeenCalledTimes(1);
  });

  it("enforces the concurrency ceiling", async () => {
    let release!: (value: ResponsesTransportResult) => void;
    const pending = new Promise<ResponsesTransportResult>((resolve) => {
      release = resolve;
    });
    const model = adapter(async () => pending, { maxConcurrency: 1 });
    const first = model.propose(input());
    await expect(model.propose(input())).rejects.toMatchObject({
      code: "concurrency_limit",
    });
    release(validResult());
    await first;
  });

  it("enforces request and estimated-token minute budgets", async () => {
    const send = async () => validResult();
    const rateLimited = adapter(send, { maxRequestsPerMinute: 1 });
    await rateLimited.propose(input());
    await expect(rateLimited.propose(input())).rejects.toMatchObject({
      code: "rate_limit",
    });

    const tokenLimited = adapter(send, { maxEstimatedTokensPerMinute: 1 });
    await expect(tokenLimited.propose(input())).rejects.toMatchObject({
      code: "token_budget",
    });
  });

  it("opens the circuit and permits a probe after cooldown", async () => {
    let now = 1_000;
    const send = vi
      .fn<ResponsesTransport["send"]>()
      .mockResolvedValue({ status: "refused", refusal: "policy" });
    const model = adapter(send, { circuitFailureThreshold: 2 }, () => now);
    await expect(model.propose(input())).rejects.toBeInstanceOf(ModelSandboxError);
    await expect(model.propose(input())).rejects.toBeInstanceOf(ModelSandboxError);
    await expect(model.propose(input())).rejects.toMatchObject({ code: "circuit_open" });
    expect(send).toHaveBeenCalledTimes(2);
    now += config.circuitCooldownMs;
    await expect(model.propose(input())).rejects.toMatchObject({ code: "refusal" });
    expect(send).toHaveBeenCalledTimes(3);
  });

  it("never calls transport while disabled or above the input bound", async () => {
    const send = vi.fn<ResponsesTransport["send"]>();
    await expect(adapter(send, { enabled: false }).propose(input())).rejects.toMatchObject({
      code: "disabled",
    });
    await expect(
      adapter(send, { maxInputChars: 2 }).propose(input("long")),
    ).rejects.toMatchObject({ code: "input_limit" });
    expect(send).not.toHaveBeenCalled();
  });
});

describe("model release manifest", () => {
  const manifest: ModelReleaseManifest = {
    releaseId: "nova-model-r1-candidate-001",
    status: "candidate",
    provider: "openai",
    api: "responses",
    model: "gpt-5.6-terra",
    reasoningEffort: "low",
    promptVersion: "nova-web-prompt-1.0.0-candidate",
    policyVersion: "nova-web-policy-1.0.0",
    schemaVersion: "nova-model-output-1.0.0",
    promptHash: `sha256:${"a".repeat(64)}`,
    schemaHash: `sha256:${"b".repeat(64)}`,
    store: false,
    toolsEnabled: false,
    externalWritesEnabled: false,
    evaluationSuite: "nova-model-sandbox-synthetic-1.0.0",
    evaluationStatus: "pending",
    approverReference: null,
    rollbackReleaseId: "provider-disconnected-static-fallback",
    sourceUrls: [
      "https://developers.openai.com/api/docs/guides/latest-model",
      "https://developers.openai.com/api/docs/guides/structured-outputs",
    ],
  };

  it("accepts the disconnected candidate and rejects aliases", () => {
    expect(validateModelReleaseManifest(manifest)).toEqual(manifest);
    expect(() =>
      validateModelReleaseManifest({ ...manifest, model: "gpt-5.6" }),
    ).toThrow(ModelReleaseValidationError);
  });

  it("requires passing evidence and an approver for approved status", () => {
    expect(() =>
      validateModelReleaseManifest({ ...manifest, status: "approved" }),
    ).toThrow("Approval requires");
  });
});
