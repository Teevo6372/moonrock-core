# Nova Release 1 — Sprint 015 Implementation Record

## Sprint objective

Prepare the controlled private staging deployment and operator acceptance workflow for Nova Release 1 while preserving the non-production authorization boundary.

## Implemented

- Added a typed staging activation record that binds Sprint 014 validation evidence to deployment identity, isolated database migration state, provider isolation, external-write controls, rollback evidence, and operator acceptance.
- Added fail-closed activation logic: an accepted record cannot be produced unless validation passes, migration application is confirmed, rollback is tested, and the operator decision is accepted.
- Added tests for successful controlled activation and rejection when validation fails.
- Added the private staging activation runbook.
- Added the operator acceptance record template.

## Operational limitation

This sprint commit does not itself provision Railway infrastructure, attach PostgreSQL, enter secrets, apply a migration, or deploy a private endpoint. Those operator-controlled actions require access to the target infrastructure and must be executed using the runbook. Evidence produced during execution must remain sanitized and must not contain credentials or customer data.

## Safety boundary retained

- no public endpoint;
- no production traffic;
- no live model provider;
- no production GHL writes;
- no production credentials;
- no customer data;
- no WordPress, Elementor, XStore, or DNS modification;
- no production authorization.

## Validation

Run from `apps/nova-website-advisor-runtime`:

```bash
npm run check
```

During an operator-controlled deployment, also run:

```bash
NOVA_STAGING_BASE_URL=https://<private-staging-host> \
NOVA_STAGING_EVIDENCE_PATH=evidence/sprint-015-validation.json \
npm run validate:staging
```

## Completion gate

Sprint 015 is complete only when the repository changes are merged and the operator-controlled private staging deployment has either:

1. produced a completed acceptance record with passing evidence; or
2. been rejected and rolled back with retained failure evidence.

Merging this sprint does not authorize production activation. Sprint 016 will assemble the Release 1 closeout and production-authorization boundary package.
