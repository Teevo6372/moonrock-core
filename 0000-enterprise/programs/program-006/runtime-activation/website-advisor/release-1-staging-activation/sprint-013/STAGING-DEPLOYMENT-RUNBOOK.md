# Nova Release 1 Staging Deployment Runbook

## Boundary

This runbook authorizes only a private, non-production staging deployment. Live model providers, production GHL writes, public website traffic, DNS changes, production credentials, and customer data remain prohibited.

## Preconditions

- Sprint 013 PR merged and required checks passing.
- Railway staging project and PostgreSQL service created under Moonrock-controlled accounts.
- Service networking remains private or access-restricted.
- Secrets are entered through the platform secret store, never committed.
- Operator and rollback owners are assigned.

## Required variables

Use `apps/nova-website-advisor-runtime/.env.staging.example` as the contract. All three activation flags must remain `false`.

## Deployment

1. Configure the service root as `apps/nova-website-advisor-runtime`.
2. Attach the staging PostgreSQL service and set `DATABASE_URL`.
3. Apply `migrations/001_staging_state.sql` using the staging database console.
4. Enter `NOVA_OPERATOR_TOKEN` through the secret store.
5. Confirm `NOVA_ENVIRONMENT=staging` and `NOVA_PERSISTENCE_MODE=durable-staging`.
6. Deploy from the approved commit.
7. Verify `/health/live` and `/health/ready` before any synthetic session test.
8. Run synthetic create, message, restart, recovery, and close flows.
9. Capture commit SHA, deployment ID, migration version, readiness output, persistence evidence, and operator identity.

## Fail-closed conditions

Do not proceed when configuration is missing, migration version is absent, database health is degraded, readiness is non-200, persistence evidence records a failure, or any external activation flag is not `false`.

## Rollback

1. Disable ingress or access immediately.
2. Roll back to the last approved deployment artifact.
3. Set the runtime to memory mode only for isolated diagnosis; do not resume visitor traffic.
4. Preserve database and deployment evidence.
5. Record the reason, operator, timestamps, affected synthetic session IDs, and recovery result.
6. Require a new approval before re-enabling durable staging.

## Evidence checklist

- Approved commit SHA
- Railway deployment ID
- Database migration `001_staging_state`
- Health and readiness responses
- Restart recovery evidence
- Persistence latency and transaction counters
- Rollback test result
- Confirmation that provider and public-traffic flags remained disabled
