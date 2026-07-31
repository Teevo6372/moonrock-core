# Nova Website Advisor Release 1 Staging Activation — Sprint 005

## Objective

Implement the fail-closed GHL non-production validation boundary so approved
operators can later verify mappings, least-privilege reads, bounded synthetic
writes, reconciliation, booking receipts, cleanup, and kill-switch behavior.

## Scope

- non-production manifest and symbolic mapping validation;
- scope and owner readiness decision;
- transport-injected GHL sandbox adapter;
- per-tool argument allowlists;
- separately authorized synthetic write window;
- idempotent confirmed receipts;
- outcome-unknown reconciliation before retry;
- appointment receipt validation;
- reverse-order cleanup and evidence;
- timeout and kill-switch controls;
- synthetic contract tests and operator runbook.

## Exclusions

This sprint does not:

- identify or mutate a production GHL location;
- add a credential, token, location ID, calendar ID, pipeline ID, or user ID;
- instantiate a concrete GHL network transport;
- create a real contact, opportunity, task, consent record, note, or booking;
- enable general external writes;
- deploy infrastructure or modify WordPress, DNS, or production.

## Exit gate

Local synthetic tests must pass and unresolved GHL approvals must remain
visible. Owner approval of this pull request authorizes neither a GHL
connection nor a synthetic write window.
