# Nova Release 1 — Sprint 015 Private Staging Activation Runbook

## Purpose

Execute and document a controlled private staging deployment after Sprint 014 validation has been merged. This runbook does not authorize a public endpoint, live model providers, production GHL writes, production credentials, customer traffic, or production deployment.

## Required approvals

- Sprint 014 is merged.
- The operator has approved private staging infrastructure provisioning.
- The target Railway project and PostgreSQL service are isolated from production.
- The deployment commit is from the approved `main` branch.

## Provisioning sequence

1. Create or select the private Railway staging project.
2. Create the Nova runtime service from `apps/nova-website-advisor-runtime`.
3. Attach an isolated PostgreSQL service.
4. Configure only the staging variables documented by Sprint 013.
5. Confirm model provider mode is `mock` or `disabled`.
6. Confirm all GHL and external-write controls are disabled.
7. Confirm no production secret or customer data is present.
8. Apply `migrations/001_staging_state.sql` only to the isolated staging database.
9. Deploy the approved commit.
10. Record Railway service ID, deployment ID, commit SHA, migration ID, and UTC time.

## Validation sequence

From `apps/nova-website-advisor-runtime`:

```bash
NOVA_STAGING_BASE_URL=https://<private-staging-host> \
NOVA_STAGING_EVIDENCE_PATH=evidence/sprint-015-validation.json \
npm run validate:staging
```

Required results:

- health passes;
- readiness passes;
- provider isolation passes;
- external writes are recorded as disabled;
- overall evidence status is `pass`.

## Persistence and restart acceptance

- Create a synthetic staging session.
- Confirm the session is persisted in the isolated database.
- Restart or redeploy the service.
- Confirm the same synthetic session is recovered exactly once.
- Confirm the next durable version advances without duplicate mutation.
- Retain sanitized evidence; never commit credentials or customer data.

## Rollback rehearsal

1. Record the active deployment ID.
2. Revert to the previously approved staging deployment or disable durable mode according to the Sprint 013 rollback procedure.
3. Verify health and readiness after rollback.
4. Confirm external writes and public traffic remain disabled.
5. Restore the Sprint 015 candidate only after rollback evidence is retained.

## Acceptance rule

Private staging is rejected unless automated validation passes, the migration is confirmed, restart recovery succeeds, rollback is rehearsed, provider isolation is demonstrated, and the operator signs the acceptance record.

## Stop conditions

Stop and reject activation immediately if:

- a production credential is detected;
- a live provider is enabled;
- external writes are enabled;
- the target becomes publicly discoverable;
- migration state is ambiguous;
- persistence or restart recovery fails;
- rollback cannot be completed.
