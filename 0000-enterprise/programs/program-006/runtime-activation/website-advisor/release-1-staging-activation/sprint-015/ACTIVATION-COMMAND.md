# Sprint 015 Activation Record Command

After Sprint 014 validation evidence, migration confirmation, and rollback evidence exist, generate the sanitized activation record from `apps/nova-website-advisor-runtime`:

```bash
NOVA_STAGING_EVIDENCE_PATH=evidence/sprint-015-validation.json \
NOVA_STAGING_ACTIVATION_PATH=evidence/sprint-015-activation.json \
NOVA_RAILWAY_SERVICE_ID=<service-id> \
NOVA_RAILWAY_DEPLOYMENT_ID=<deployment-id> \
NOVA_DEPLOYMENT_COMMIT_SHA=<approved-sha> \
NOVA_STAGING_MIGRATION_ID=001_staging_state \
NOVA_STAGING_MIGRATION_APPLIED=true \
NOVA_PROVIDER_MODE=mock \
NOVA_STAGING_ROLLBACK_TESTED=true \
NOVA_STAGING_ROLLBACK_EVIDENCE=<sanitized-reference> \
NOVA_STAGING_OPERATOR=<operator-name> \
NOVA_STAGING_OPERATOR_DECISION=accepted \
npm run record:staging-activation
```

The command fails closed when validation is not passing, migration application is not confirmed, rollback is not confirmed, provider mode is not mock/disabled, or the operator decision is not accepted.

Do not place secrets, tokens, database URLs, customer data, or private endpoint credentials in command history or committed evidence.
