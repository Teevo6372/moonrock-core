# Sprint 014 Implementation Record

## Scope

Sprint 014 adds the repository-controlled validation and evidence layer required before a separately authorized private staging deployment.

## Implemented

- Configurable HTTP staging validation harness.
- Machine-readable evidence schema and JSON writer.
- Fail-closed acceptance assertion.
- CLI command exposed as `npm run validate:staging`.
- Synthetic pass and failure tests.
- Operator staging acceptance checklist.

## Evidence contract

The harness records:

- schema and release identifiers;
- staging target and generation timestamp;
- health and readiness results;
- provider isolation result;
- mock-provider declaration;
- external-write prohibition;
- overall pass/fail status.

## Governance boundary

This sprint does not provision infrastructure, enter credentials, execute database migrations, enable a live model provider, enable GHL writes, expose a public endpoint, change DNS, or modify WordPress/Elementor.

## Validation

Run from `apps/nova-website-advisor-runtime`:

```bash
npm run check
```

For an operator-controlled private target:

```bash
NOVA_STAGING_BASE_URL=https://<private-staging-host> npm run validate:staging
```

## Exit gate

Sprint 014 is complete when repository checks pass, the evidence harness is approved, and the operator checklist is accepted. Actual private staging deployment remains Sprint 015 work and requires separate authorization.
