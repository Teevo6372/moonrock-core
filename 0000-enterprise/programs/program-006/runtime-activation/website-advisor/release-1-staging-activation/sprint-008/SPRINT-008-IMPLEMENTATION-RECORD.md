# Nova Website Advisor Release 1 Deployment Activation — Sprint 008 Record

## Status

Complete for draft review. The PostgreSQL foundation is active and verified in
private Railway staging. Conversation-session cutover remains disabled.

## Delivered

- Railway-private PostgreSQL service reference attached to the Nova runtime;
- explicit migration authorization enabled;
- successful migration-safe deployment of merged PR `#68`;
- managed-database adapter verification;
- successful deployment health result;
- successful container restart and repeated adapter verification;
- retained provider-disconnected runtime posture;
- retained unexposed-service boundary;
- non-secret evidence and rollback procedure.

## Repository verification

Run from `apps/nova-website-advisor-runtime`:

```text
npm run check
```

Sprint 008 adds evidence only; it does not change runtime code.

## External posture

- Railway PostgreSQL: connected privately;
- schema migrations: enabled and verified;
- runtime service: active, healthy, and unexposed;
- conversation state: in-memory;
- model providers: disconnected;
- GHL and external writes: disabled;
- WordPress/XStore/Elementor/DNS: unchanged;
- pilot and production: not authorized.

## Next gate

After owner approval, a distinct Sprint 009 may implement the managed-database
conformance harness and durable conversation-session cutover controls. It must
fail closed, prohibit partial dual-write, prove rollback/recovery behavior, and
remain private and provider-disconnected until separately approved.

## Rollback

Follow `RAILWAY-STAGING-DATABASE-ACTIVATION-EVIDENCE.md`. Repository rollback is
a revert of the Sprint 008 evidence commit; infrastructure rollback requires
removing only the two approved runtime service variables and redeploying.
