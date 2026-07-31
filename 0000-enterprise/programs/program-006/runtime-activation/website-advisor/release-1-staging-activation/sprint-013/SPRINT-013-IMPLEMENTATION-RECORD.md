# Sprint 013 Implementation Record

## Objective

Prepare Nova Release 1 for an operator-controlled, private staging deployment without activating production infrastructure or external providers.

## Delivered

- Railway staging service manifest with build, start, health-check, restart, and single-replica settings.
- Staging-only environment-variable contract with all public traffic, live provider, and GHL write flags disabled.
- PostgreSQL migration for sessions, consent actions, idempotency records, and migration evidence.
- Deployment, verification, failure, and rollback runbook.

## Safety posture

- No Railway project was provisioned by this change.
- No database or credential was connected.
- No public domain, DNS, WordPress, Elementor, or website integration changed.
- No live model provider or production GHL operation was enabled.
- No customer data was used.

## Operator gate

Merging this sprint permits configuration review only. Creating the Railway service, entering secrets, applying the migration, or deploying the runtime requires a separate explicit operator action and evidence capture.

## Validation expectations

- Validate `railway.json` against the platform schema during provisioning.
- Apply the SQL migration only to the isolated staging database.
- Run `npm run check` from `apps/nova-website-advisor-runtime` before deployment.
- Verify live/readiness endpoints and synthetic restart recovery before approving continued staging operation.
