# Provider, Observability, Incident, and Rollback Gates

## Model sandbox gate

Before the model adapter may change from `disconnected` to `sandbox`:

- provider and exact model identifier are approved;
- data-use and retention terms are reviewed;
- credential scope and owner are recorded;
- request timeout, token/cost, concurrency, and circuit-breaker limits exist;
- system prompt and model-output schema versions are immutable;
- no tool call executes from unvalidated model output;
- full synthetic evaluation catalog passes;
- fallback response and kill switch are verified;
- model change rollback is documented.

Model sandbox approval does not authorize GHL or external writes.

## GHL sandbox gate

Before the GHL adapter may change from `disconnected` to `sandbox`:

- a non-production location is identified;
- least-privilege scopes are reviewed;
- contact, opportunity, consent, booking, transcript-summary, and ownership
  mappings are approved;
- test calendars, pipelines, fields, workflows, users, and tags are explicitly
  non-production;
- duplicate detection and idempotency tests pass;
- outcome-unknown reconciliation is assigned;
- delete/cleanup procedures are verified;
- audit evidence contains identifiers but no secret;
- kill-switch behavior is verified.

Sprint 001 keeps `externalWritesEnabled` fixed to `false`. A later sprint must
explicitly authorize bounded synthetic writes in the non-production location.

## Knowledge promotion gate

Synthetic knowledge is replaced only by an immutable, hash-verified,
public-approved Release 1 bundle whose sources, versions, sections, owners,
review dates, conflicts, exclusions, and rollback version are recorded.

## Observability

Required redacted signals:

- liveness and readiness;
- request volume, status, latency, and rate limiting;
- session state and completion counts;
- schema/policy denial reason codes;
- escalation and handoff states;
- consent category outcomes without contact content;
- adapter latency, timeout, circuit, and dependency health;
- idempotency duplicate and outcome-unknown counts;
- knowledge, prompt, policy, runtime, and model release identifiers;
- kill-switch and degraded-mode events.

Alerts must cover readiness failure, error-rate threshold, provider timeout,
outcome unknown, abnormal denials, suspected sensitive-data submission,
knowledge expiry, idempotency conflict, spend/concurrency threshold, and kill
switch.

## Incident path

Each alert class identifies severity, acknowledgement target, response time,
containment action, evidence fields, notification route, reconciliation owner,
recovery test, and post-incident review. Nova cannot downgrade an incident or
re-enable a closed adapter.

## Rollback

Every staging release records:

- current and prior immutable release IDs;
- database migration compatibility;
- prompt, model, policy, schema, and knowledge versions;
- rollback operator and approval;
- kill-switch procedure;
- provider-disable procedure;
- static website fallback;
- data reconciliation steps;
- verification queries and acceptance evidence.

Rollback must not require WordPress to remain healthy and must not repeat an
external action whose outcome is unknown.
