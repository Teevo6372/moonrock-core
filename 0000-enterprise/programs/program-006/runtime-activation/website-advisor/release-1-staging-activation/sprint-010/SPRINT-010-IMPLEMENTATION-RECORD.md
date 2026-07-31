# Nova Website Advisor Release 1 Deployment Activation — Sprint 010 Record

## Status

Implemented for draft review. This sprint adds the runtime coordination primitive required to recover and commit durable conversation sessions without activating Railway cutover variables.

## Delivered

- durable session coordinator with explicit create, recover, ensure-loaded, commit, and forget operations;
- optimistic durable version tracking for every recovered or newly created session;
- fail-closed commit behavior when recovery/version evidence is unavailable;
- controlled in-memory cache restoration for restart recovery;
- synthetic tests for initial persistence, post-restart recovery, version advancement, and fail-closed commits.

## Safety boundary

- no Railway variables are changed;
- `NOVA_DURABLE_SESSION_CUTOVER` is not activated;
- model providers remain disconnected;
- GHL reads and writes remain mock-only;
- no public network, WordPress, Elementor, XStore, DNS, pilot, or production change;
- no credentials, visitor records, or provider data are used;
- no background dual-write path is introduced.

## Runtime integration gate

The coordinator is intentionally separate from HTTP route activation. A later separately authorized operation must wrap session create/message/consent/close transactions so durable writes are awaited before success responses. Activation must fail closed if recovery or commit fails.

## Validation

Run from `apps/nova-website-advisor-runtime`:

```text
npm run check
```

Expected Sprint 010 coverage:

1. newly created session persists at version 1;
2. committed session advances its durable version;
3. a restarted runtime recovers the session into an empty cache;
4. commit without recovery evidence is rejected.

## Rollback

Revert the Sprint 010 coordinator, recovery hook, tests, and record. No Railway rollback is required because this sprint does not activate the durable-session cutover.

## Next gate

A separate owner-approved Sprint 011 may integrate awaited durable transactions into the HTTP session routes and execute redacted Railway restart/recovery evidence while keeping providers, GHL writes, public traffic, and production disabled.
