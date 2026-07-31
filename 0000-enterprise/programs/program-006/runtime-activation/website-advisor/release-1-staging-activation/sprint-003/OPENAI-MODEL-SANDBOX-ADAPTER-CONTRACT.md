# OpenAI Model Sandbox Adapter Contract

## Architecture

Nova uses an injected `ResponsesTransport` behind `ModelAdapter`. The core
runtime owns privacy filtering, context bounds, release configuration,
structured-output validation, deterministic policy, and public response
selection. The transport owns only authenticated delivery to the approved
Responses endpoint and must never be exposed to the browser.

Sprint 003 supplies no concrete network transport. Tests use scripted,
in-process transports.

## Request invariants

Every request must:

- use the exact model identifier in the approved release manifest;
- use the Responses API and `text.format` JSON Schema with `strict: true`;
- set `store: false`;
- omit tools and all external-write capability;
- use a stable SHA-256-derived session pseudonym as `safety_identifier`;
- contain only the approved prompt, allowlisted runtime state, bounded
  public-approved knowledge, and a redacted visitor message;
- bind prompt, policy, and schema versions into runtime context;
- enforce configured input and output bounds.

Provider credentials are resolved by infrastructure from a `secretref://`
reference. They are not configuration values and never enter request objects,
events, logs, fixtures, transcripts, or repository files.

## Output handling

Completed text is parsed as JSON and validated against
`model-output.schema.json`. Refusal, incomplete output, invalid JSON, and
schema failure are safe failures. No unvalidated model text reaches the
visitor or a tool.

Model output remains a proposal. Existing deterministic policy retains full
authority to reject its response, lifecycle recommendation, route, risk
classification, or tool request.

## Operational controls

The adapter enforces:

- fail-closed disabled state;
- maximum input characters and output tokens;
- in-process concurrency admission;
- rolling one-minute request and estimated-token budgets;
- per-request timeout and abort;
- one bounded retry only when the transport explicitly proves that retry is
  safe before an outcome exists;
- no retry after an ambiguous outcome;
- a consecutive-failure circuit breaker with cooldown probe.

Production-grade distributed rate and concurrency enforcement belongs in the
later staging platform layer. Local controls remain defense in depth.

## Safe fallback

Any adapter failure maps to the existing static unavailable/human-handoff
path. Error codes are bounded and contain no raw provider response, visitor
content, credential, or internal exception detail.
