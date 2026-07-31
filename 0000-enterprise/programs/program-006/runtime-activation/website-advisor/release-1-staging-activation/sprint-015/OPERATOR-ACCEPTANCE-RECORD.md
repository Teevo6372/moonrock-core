# Nova Release 1 — Sprint 015 Operator Acceptance Record

Complete this record only after the controlled private staging deployment and rollback rehearsal are performed. Do not place secrets, tokens, connection strings, customer data, or private endpoint credentials in this file.

## Deployment identity

- Operator:
- UTC activation time:
- Approved commit SHA:
- Railway project reference:
- Railway service ID:
- Railway deployment ID:
- PostgreSQL service reference:
- Migration ID:

## Control verification

- [ ] Target is private and isolated from production.
- [ ] Provider mode is `mock` or `disabled`.
- [ ] External writes are disabled.
- [ ] Public traffic is disabled.
- [ ] Production credentials are absent.
- [ ] Customer data is absent.
- [ ] Migration `001_staging_state` was applied only to staging.

## Acceptance evidence

- Validation evidence reference:
- Persistence evidence reference:
- Restart recovery evidence reference:
- Rollback evidence reference:
- Incident or exception reference, if any:

## Required results

- [ ] Health passed.
- [ ] Readiness passed.
- [ ] Provider isolation passed.
- [ ] Synthetic session persisted.
- [ ] Restart recovery succeeded exactly once.
- [ ] Durable version advanced without duplicate mutation.
- [ ] Rollback rehearsal succeeded.
- [ ] Post-rollback health and readiness passed.

## Decision

Choose exactly one:

- [ ] Accepted for continued private staging operation.
- [ ] Rejected and rolled back.

Operator notes:

Operator signature/name:

UTC decision time:

## Authorization boundary

Acceptance permits only continued private, non-production staging operation under mock or disabled provider mode. It does not authorize a public endpoint, live model calls, GHL writes, production credentials, customer traffic, WordPress integration, DNS changes, pilot access, or production activation.
