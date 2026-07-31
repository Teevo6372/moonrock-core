# Nova Website Advisor Release 1 Staging Activation — Sprint 002 Record

## Status

Complete for draft review. The platform remains provider-disconnected and
undeployed.

## Delivered

- multi-stage, non-root Node.js 22 container contract;
- repository-root Docker context exclusions;
- localhost default and explicit container bind behavior;
- bounded, canonical-path staging configuration loader;
- critical dependency health registry;
- durable repository interface and in-memory conformance implementation;
- optimistic session version and sequence protection;
- append-only consent-action uniqueness;
- transactional idempotency claim and terminal receipt/outcome contract;
- PostgreSQL-compatible initial staging schema;
- bounded session-scoped event stream hub;
- public-safe opt-in live SSE with cancellation and backpressure reset;
- platform, durable-state, streaming, configuration, health, migration, and
  container tests.

## Verification

Run from `apps/nova-website-advisor-runtime`:

```text
npm run check
```

The check performs strict TypeScript validation, the complete synthetic test
suite, and TypeScript build. The current execution environment does not expose
a Docker daemon, so the Dockerfile is contract-tested but no image is built or
pushed in this sprint.

## External posture

- infrastructure: not created;
- container registry: not selected or used;
- database: not provisioned;
- configuration service: not selected;
- secret store: not selected;
- model: disconnected;
- GHL: disconnected;
- external writes: disabled;
- WordPress/DNS: unchanged;
- deployment: not authorized.

## Sprint 003 entry gate

Sprint 003 may begin only after this pull request is approved. Model sandbox
work must still select and approve the provider/model, data-use terms, secret
store, cost/timeout/concurrency controls, evaluation plan, and rollback. Merge
of Sprint 002 alone does not authorize provider access.

## Rollback

Revert the Sprint 002 commit. No infrastructure or external system requires
cleanup.
