# Nova Release 1 — Sprint 014 Staging Acceptance Checklist

## Purpose

Provide a repeatable, fail-closed validation and evidence workflow for the private Nova staging runtime. Completion does not authorize public access, production providers, GHL writes, customer data, or production deployment.

## Preconditions

- Sprint 013 repository preparation is merged.
- The target is an isolated staging environment.
- Model provider mode is `mock` or `disabled`.
- External writes remain disabled.
- No production credentials or customer data are present.

## Automated validation

From `apps/nova-website-advisor-runtime` run:

```bash
NOVA_STAGING_BASE_URL=https://<private-staging-host> npm run validate:staging
```

Optional evidence destination:

```bash
NOVA_STAGING_EVIDENCE_PATH=evidence/sprint-014.json \
NOVA_STAGING_BASE_URL=https://<private-staging-host> \
npm run validate:staging
```

The command must exit non-zero if any required check fails.

## Required evidence

- Health endpoint returns success.
- Readiness endpoint returns success and does not report `ready: false`.
- Provider isolation reports `mock`, `disabled`, or no active provider.
- Evidence identifies Release 1, staging environment, UTC generation time, and target base URL.
- Evidence records `externalWritesEnabled: false`.
- Overall evidence status is `pass`.

## Operator verification

- Confirm the target is private and not linked from the public website.
- Confirm no live provider key is present.
- Confirm GHL and other external writes remain disabled.
- Store the generated JSON evidence with the deployment record.
- Record the deployment commit SHA and migration identifier.
- Exercise the Sprint 013 rollback runbook and retain rollback evidence before acceptance.

## Acceptance decision

Staging acceptance is denied when any automated check fails, evidence is missing, provider isolation cannot be demonstrated, or rollback has not been verified.

Acceptance of Sprint 014 authorizes only progression to Sprint 015 controlled private staging deployment. It does not authorize production activation.
