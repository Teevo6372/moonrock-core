# GHL Sandbox Operator Runbook

## Current Sprint 005 procedure

1. Run `npm run check` from `apps/nova-website-advisor-runtime`.
2. Confirm all GHL tests use the scripted in-process transport.
3. Confirm the candidate manifest has unresolved review/owner references.
4. Confirm no GHL identifier, credential, provider SDK, or network endpoint was
   added.
5. Review scope, argument, receipt, reconciliation, cleanup, timeout, and kill
   switch tests.
6. Submit the draft pull request for owner approval.

## Future connected validation prerequisites

Before any GHL call, obtain written approval for:

- a dedicated non-production location;
- exact least-privilege integration scopes and credential owner;
- actual mapping inventory with CRM-owner signoff;
- synthetic fixture naming and deletion policy;
- read-only validation window;
- reconciliation and cleanup owners;
- redacted audit destination;
- kill-switch operator and incident route.

Before any write, obtain a second authorization defining the exact tool list,
time window, successful-write ceiling, fixture prefix, and approver.

## Connected validation sequence

1. Verify the location is non-production and contains no production workflow,
   client, calendar, user, or automation.
2. Resolve protected mappings; do not copy IDs into source control.
3. Enable only approved read scopes and verify duplicate/calendar projections.
4. Review read evidence.
5. If separately approved, enable the smallest synthetic write window.
6. Test one object family at a time.
7. Confirm idempotent replay and appointment receipt behavior.
8. induce an outcome-unknown fixture and reconcile without blind retry.
9. enable the kill switch and prove zero further transport calls.
10. clean up in reverse order and obtain zero-failure cleanup evidence.
11. revoke/disable the temporary write authorization and credential access.

## Stop conditions

Stop for a production identifier, real contact data, unexpected workflow
trigger, broad scope, missing owner, unredacted evidence, unknown outcome,
cleanup failure, or any request beyond the approved count or window.
