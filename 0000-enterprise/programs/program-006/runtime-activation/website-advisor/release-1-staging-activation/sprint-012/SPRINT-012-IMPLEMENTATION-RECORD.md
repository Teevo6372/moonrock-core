# Nova Website Advisor Release 1 Deployment Activation — Sprint 012 Record

## Status

Implemented for draft review. This sprint activates awaited session persistence transactions inside the non-production HTTP runtime while leaving durable staging mode opt-in and all external providers disconnected.

## Delivered

- awaited transaction boundaries for session creation, messages, consent changes, handoffs, booking requests, and session closure;
- durable recovery before mutable operations when a session is absent from the runtime cache;
- fail-closed responses when recovery, persistence, or optimistic concurrency verification fails;
- persistence health evidence with latency, success, failure, conflict, recovery, and rollback counters;
- synthetic tests for create persistence, restart recovery, resumed commits, optimistic conflicts, and rollback;
- explicit persistence mode in readiness output and a local persistence evidence endpoint.

## Transaction rule

A mutable HTTP route may only return its success response after the associated durable staging write completes. In memory mode, behavior remains local and no durable write is attempted. In durable-staging mode, a failed recovery or commit prevents the success response.

## Safety boundary

- `memory` remains the default persistence mode;
- no Railway variables are changed;
- no PostgreSQL or external durable store is activated;
- model providers remain disconnected;
- GHL remains mock-only;
- no public networking, WordPress, Elementor, XStore, DNS, pilot, or production change is included;
- no production credentials or visitor records are used;
- the persistence evidence endpoint is local/staging runtime functionality only.

## Validation

Run from `apps/nova-website-advisor-runtime`:

```text
npm run check
```

Expected Sprint 012 coverage:

1. session creation is not reported successful before durable version 1 exists;
2. restart recovery restores a session and the resumed mutation advances its version once;
3. stale concurrent mutation is rejected and recorded as a transaction failure/conflict;
4. rollback switches subsequent operations to memory-only behavior;
5. mutable HTTP routes await their persistence transaction before returning success.

## Rollback

Call the governed rollback operation to return the runtime to `memory`, or revert the Sprint 012 controller, route wiring, tests, and record. No infrastructure rollback is required because no Railway, PostgreSQL, provider, GHL, DNS, or public traffic activation occurs in this sprint.

## Next gate

A separately approved Sprint 013 may provision and validate an isolated staging infrastructure runtime with synthetic data. Live providers, production GHL, public traffic, and production credentials remain separately prohibited until explicitly authorized.
