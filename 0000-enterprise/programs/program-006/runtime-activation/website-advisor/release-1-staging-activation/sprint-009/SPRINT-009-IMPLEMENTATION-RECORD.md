# Nova Website Advisor Release 1 Deployment Activation — Sprint 009 Record

## Status

Implemented for draft review. This sprint adds portable durable-state conformance and fail-closed session-cutover controls. It does not activate the cutover in Railway.

## Delivered

- explicit `memory` or `postgres` persistence-mode decision;
- default memory-mode retention;
- mandatory private database reference for PostgreSQL mode;
- mandatory `passed` conformance evidence before cutover authorization;
- separate explicit durable-session cutover flag;
- rejection of contradictory or incomplete configurations;
- portable repository conformance checks for roundtrip loading, optimistic versions, stale-write rejection, and idempotent replay;
- synthetic tests that use no provider, GHL, visitor, credential, or production data.

## Non-production boundary

- Railway service remains private and unexposed;
- model providers remain disconnected;
- GHL and external writes remain disabled;
- no WordPress, Elementor, XStore, DNS, or public endpoint change;
- no partial dual-write mode exists;
- no production or pilot authorization is granted;
- merge alone does not authorize setting Railway cutover variables.

## Activation variables

The runtime must fail closed unless all three PostgreSQL conditions are present:

```text
NOVA_SESSION_PERSISTENCE=postgres
NOVA_DURABLE_STATE_CONFORMANCE=passed
NOVA_DURABLE_SESSION_CUTOVER=true
```

`DATABASE_URL` must also be present as a host-managed private service reference. Secret values must never be committed or copied into evidence.

## Required Railway operation after separate approval

1. Run the conformance harness against an isolated staging test session namespace.
2. Record redacted pass/fail evidence and confirm no residual synthetic records.
3. Set the cutover variables only after owner approval.
4. Restart the private service and verify create/load/update/restart recovery.
5. Confirm providers, GHL, public networking, and pilot traffic remain disabled.
6. On any failure, remove the cutover flag and redeploy to memory mode.

## Validation

Run from `apps/nova-website-advisor-runtime`:

```text
npm run check
```

Expected new coverage: four Sprint 009 tests for default memory mode, fail-closed prerequisites, explicit authorization, and repository conformance.

## Rollback

Revert the Sprint 009 files. If a later separately approved Railway operation sets cutover variables, remove `NOVA_DURABLE_SESSION_CUTOVER` first, set `NOVA_SESSION_PERSISTENCE=memory`, redeploy, and verify the provider-disconnected private runtime before any further action.

## Next gate

A separate owner-approved operation may connect the cutover controls to runtime session orchestration and execute Railway recovery evidence. This draft does not claim that live runtime sessions are already persisted in PostgreSQL.
