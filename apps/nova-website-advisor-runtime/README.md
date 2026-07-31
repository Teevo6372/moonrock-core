# Nova Website Advisor Runtime

Non-production Release 1 staging-activation Sprint 002 portable platform
foundation for the governed Nova Website Advisor.

## Included

- in-memory session store;
- deterministic lifecycle transitions;
- policy and authority engine;
- strict model-output schema validation;
- approved knowledge-bundle loader;
- mock model and GHL adapters;
- redacted operational events;
- idempotent mock writes and receipts;
- kill switch and degraded modes;
- OpenAPI-aligned local HTTP endpoints and problem envelopes;
- one-shot public-safe server-sent event responses;
- request-size, origin, rate, sequence, and session-lifetime controls;
- explicit-purpose consent gates for synthetic handoff and booking workflows;
- accessible, credential-free browser prototype;
- non-controlling Continuous Learning Queue with role-gated lifecycle;
- governed experiment authorization and aggregate quality snapshots;
- deterministic, human-owned production release gate;
- fail-closed staging configuration and readiness contract;
- portable container, durable-state, health, and bounded live-SSE contracts;
- synthetic contract, lifecycle, safety, privacy, and injection tests.

## Excluded

- public or internet-accessible endpoint;
- OpenAI SDK or network call;
- GHL SDK or network call;
- credentials or secret configuration;
- persistent transcript storage;
- WordPress integration;
- deployment configuration;
- production activation.

## Local verification

```bash
npm install
npm run check
npm run dev
```

The package requires Node.js 22–26. Tests use synthetic data only. The optional
local server listens on `127.0.0.1:8787`; open
`http://127.0.0.1:8787/prototype/` for the browser prototype.

## Architecture

The orchestrator accepts adapters through interfaces. A model may propose a response, route, or tool, but the runtime validates the model schema and applies deterministic lifecycle, consent, risk, and tool policy before any adapter method is invoked.

Provider adapters remain mocks in Sprint 006. Health output declares
`providers: disconnected`, and the bundled knowledge is explicitly synthetic.
Adding a live adapter, credentials, WordPress integration, staging deployment,
or production activation requires a later approved sprint.
