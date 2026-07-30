# Sprint 004 — Runtime Foundation Implementation Record

## Objective

Implement and validate the provider-disconnected Nova Website Advisor runtime foundation defined by Sprints 001–003.

## Implemented

- TypeScript package under `apps/nova-website-advisor-runtime`
- In-memory non-production session state
- Governed lifecycle transition table
- Deterministic consent, risk, health, state, tool, and authority policy
- JSON Schema validation of model proposals
- Immutable public-approved knowledge loader and hash verification
- Mock model and GHL adapter interfaces
- Idempotent mock GHL receipts
- Sensitive-data redaction
- Redacted structured events
- Kill switch and dependency-degraded behavior
- Orchestration of anonymous guidance, consent gates, protected escalation, mock writes, confirmed receipts, and unknown outcomes
- Synthetic tests for contracts, lifecycle, policy, knowledge, privacy, prompt injection, provider outcomes, and fallback

## Explicitly not implemented

- OpenAI SDK, key, network call, or live model
- GHL token, API call, object, field, workflow, or live identifier
- HTTP server or public endpoint
- WordPress client or production change
- persistent database or transcript
- deployment, hosting, DNS, environment, or credential configuration
- voice, animation, or realtime audio

## Security posture

The model adapter returns an untrusted proposal that must pass the Sprint 003 JSON Schema. Deterministic policy reauthorizes every proposed tool against lifecycle state, risk, consent, dependency health, and kill-switch state.

Provider success requires a receipt. Unknown write outcomes are not retried or reported as success.

## Validation commands

Run from `apps/nova-website-advisor-runtime`:

```bash
npm install
npm run check
```

## Sprint 004 completion gate

- dependency installation completes from the lockfile;
- TypeScript strict typecheck passes;
- all synthetic tests pass;
- production build passes;
- no credentials or production identifiers are present;
- only the new runtime package and this record are changed;
- owner approves the draft PR;
- no live adapter, WordPress integration, or deployment begins without the next approved sprint.

