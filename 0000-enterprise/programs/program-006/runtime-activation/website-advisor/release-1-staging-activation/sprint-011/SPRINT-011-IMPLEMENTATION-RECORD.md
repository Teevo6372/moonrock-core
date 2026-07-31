# Nova Website Advisor Release 1 Deployment Activation — Sprint 011 Record

## Status

Implemented for draft review. This sprint wires the Sprint 010 durable-session coordinator into runtime bootstrap through an explicit persistence controller while keeping memory mode as the default.

## Delivered

- governed `memory` and `durable-staging` persistence modes;
- runtime bootstrap construction of the durable coordinator and persistence controller;
- explicit create, recovery, commit, and rollback transaction boundaries;
- structured, redacted persistence evidence containing operation, session identifier, mode, version, and timestamp;
- synthetic restart/recovery/continuation evidence;
- optimistic concurrency conflict verification across two runtime instances;
- rollback verification proving no new durable writes occur after returning to memory mode;
- default-mode verification proving ordinary local runtime startup performs no durable writes.

## Safety boundary

- memory mode remains the default;
- no Railway environment variables are changed;
- no PostgreSQL cutover is activated;
- HTTP routes are not yet switched to durable-staging mode;
- model providers remain disconnected;
- GHL remains mock-only and external writes remain disabled;
- no public networking, WordPress, Elementor, XStore, DNS, pilot, or production change;
- no credentials, visitor records, or provider data are used.

## Validation

Run from `apps/nova-website-advisor-runtime`:

```text
npm run check
```

Expected Sprint 011 coverage:

1. create and persist a synthetic session;
2. restart into an empty cache and recover the session;
3. continue the session and advance the durable version;
4. reject a stale concurrent writer through optimistic version enforcement;
5. roll back to memory mode without further durable writes;
6. verify memory mode remains the no-write default.

## Rollback

Call `rollbackToMemory()` for a controlled runtime rollback or revert the Sprint 011 controller, bootstrap wiring, tests, and record. No infrastructure rollback is required because this sprint does not activate Railway or PostgreSQL cutover variables.

## Next gate

A separately approved Sprint 012 may integrate awaited persistence operations into the HTTP session create/message/consent/close routes and execute controlled non-production staging activation evidence. Providers, GHL production writes, public traffic, WordPress embedding, and production must remain disabled unless separately authorized.
