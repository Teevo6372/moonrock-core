# Nova Website Advisor Runtime

Non-production Sprint 004 foundation for the governed Nova Website Advisor.

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
- synthetic contract, lifecycle, safety, privacy, and injection tests.

## Excluded

- HTTP server or public endpoint;
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
```

The package requires Node.js 22–26. Tests use synthetic data only.

## Architecture

The orchestrator accepts adapters through interfaces. A model may propose a response, route, or tool, but the runtime validates the model schema and applies deterministic lifecycle, consent, risk, and tool policy before any adapter method is invoked.

Provider adapters remain mocks in Sprint 004. Adding a live adapter requires a later approved sprint.

