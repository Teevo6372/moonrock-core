# Operator Evaluation Runbook

## Local synthetic run

1. Confirm the worktree contains the approved release, prompt, policy, schema,
   knowledge, and fixture versions.
2. Copy `evaluation-run-manifest.template.json` to a temporary evidence
   workspace outside source control.
3. Assign a unique run ID and operator reference.
4. Keep `environment` set to `synthetic-local` and
   `maxEstimatedCostMicros` set to `0`.
5. Run `npm run check` from `apps/nova-website-advisor-runtime`.
6. Record the resulting test-run reference. Do not copy raw test inputs or
   output into an evidence record.
7. Complete a human-review record for every declared fixture dimension.
8. Verify evidence hash, fixture count, zero cost, critical failures, and
   blockers.
9. Submit the immutable evidence and reviews to the human release owner.

## Stop conditions

Stop immediately for:

- a non-synthetic fixture;
- real personal/client data;
- a credential or secret value;
- an unexpected network attempt;
- cost above zero in a local run;
- duplicate fixture ID;
- critical failure;
- raw input/output in evidence;
- missing release/version binding.

## Provider sandbox boundary

Do not change `environment` to `authorized-provider-sandbox`, provide a secret,
or instantiate a network transport without a separate written approval that
sets the exact release, budget, data boundary, access owner, observation
window, and rollback procedure.

## Rollback

For local Sprint 004 work, stop the process and discard temporary evidence
files. Repository rollback is a revert of the Sprint 004 commit. No external
cleanup is expected.
