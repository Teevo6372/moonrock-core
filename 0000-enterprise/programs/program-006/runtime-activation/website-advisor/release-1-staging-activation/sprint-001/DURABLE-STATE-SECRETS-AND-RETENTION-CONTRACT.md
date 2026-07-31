# Durable State, Secrets, and Retention Contract

## Durable state model

The staging implementation must expose repository interfaces for:

- sessions and optimistic state version;
- consent evidence and withdrawal history;
- idempotency claims and authoritative provider receipts;
- redacted runtime events;
- knowledge release metadata;
- release and configuration evidence;
- incident/reconciliation work items.

The preferred portable implementation is a transactional managed relational
database. A separate ephemeral cache or pub/sub service may support rate limits
and SSE fan-out, but cannot become the only source of consent, idempotency, or
provider-outcome truth.

## Transaction rules

1. Session message sequence is compare-and-set.
2. Lifecycle transition validates the stored current state and version.
3. Consent evidence is append-only; current status is a projection.
4. Idempotency claim is unique by operation scope and request key.
5. Provider action begins only after the idempotency claim is committed.
6. Confirmed provider receipt is linked to the claim and correlation ID.
7. Outcome unknown is never automatically retried as a new action.
8. Expiry does not delete consent, receipt, or incident evidence prematurely.
9. Cross-session and cross-environment access is denied.
10. Backup restore must preserve uniqueness and audit relationships.

## Transcript posture

Raw transcript storage remains disabled in Sprint 001. Session processing may
hold the current bounded message only for the time required to produce the
response. Redacted operational events and explicitly consented, approved
summaries are separate record classes.

Before transcript storage can be enabled, Moonrock must approve:

- business purpose;
- disclosure and affirmative consent;
- exact retained fields;
- access roles;
- encryption;
- retention and deletion periods;
- withdrawal behavior;
- legal hold;
- export and correction path;
- processor/subprocessor treatment;
- incident handling.

## Retention policy identifiers

Configuration references an approved retention-policy identifier instead of
hard-coding periods. The future policy must independently classify:

- anonymous session state;
- consent evidence;
- idempotency/provider receipts;
- redacted events and metrics;
- approved summaries;
- security/incident evidence;
- backups.

Absence of an approved retention policy is a staging blocker.

## Secret-reference contract

Configuration contains opaque references in the form:

```text
secretref://<environment>/<purpose>
```

It never contains the value. Required purposes may include model credential,
GHL credential, durable-state credential, telemetry credential, and signing
material. A purpose is added only when its adapter or control is approved.

Secret controls:

- separate values and access roles for staging and production;
- least-privilege deployment identity;
- no browser, WordPress, repository, prompt, event, or error exposure;
- rotation without source change;
- version/audit metadata;
- startup failure when required reference resolution fails;
- immediate adapter closure after revocation;
- no secret fallback to a committed or default value.

Sprint 001 records only reference syntax and ownership requirements. It creates
no secret, secret store, token, or account permission.
