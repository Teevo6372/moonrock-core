# Durable Repository and Migration Contract

## Repository boundary

The `DurableStateRepository` defines the persistence contract independently of
a database library or vendor. Sprint 002 includes an in-memory conformance
implementation for tests and a PostgreSQL-compatible initial migration for a
later managed relational backend.

## Authoritative records

- session lifecycle state and optimistic version;
- message sequence;
- append-only consent evidence;
- idempotency claim, terminal state, and receipt;
- redacted runtime events;
- immutable release evidence.

Raw visitor messages, transcripts, secret values, authorization headers, and
chain-of-thought are intentionally absent.

## Concurrency and idempotency rules

1. Session creation rejects duplicate identifiers.
2. Session writes require the expected optimistic version.
3. Message sequence cannot move backward.
4. Consent action identifiers are unique.
5. Idempotency uses a compound `(scope, key)` primary key.
6. The first claimant owns the operation; later claims receive existing state.
7. Confirmed state requires an authoritative receipt identifier.
8. `confirmed` and `outcome_unknown` are terminal.
9. Outcome-unknown work is reconciled rather than automatically repeated.
10. External action cannot begin until a durable claim commits.

The future database implementation must execute claim/transition operations in
transactions and map uniqueness/version conflicts to `StateConflictError`.

## Migration 0001

The initial SQL defines:

- `nova_sessions`;
- `nova_consent_evidence`;
- `nova_idempotency`;
- `nova_runtime_events`;
- `nova_release_evidence`;
- primary, unique, check, foreign-key, and lookup indexes.

The migration is forward-only in Sprint 002 because no database exists. Before
staging, Sprint 002's successor must provide:

- reviewed migration runner;
- schema-version table and checksum;
- least-privilege migration identity separate from runtime identity;
- backup and restore test;
- forward/rollback compatibility statement;
- transaction/isolation test against the selected managed database;
- retention/deletion implementation;
- load, failover, and connection-pool tests.

## Repository cutover gate

The current orchestrator still uses the existing in-memory session store. A
later sprint may replace it only after the durable adapter passes the same
lifecycle, sequence, consent, idempotency, expiry, and rollback tests. No
partial dual-write is allowed without an approved reconciliation design.
