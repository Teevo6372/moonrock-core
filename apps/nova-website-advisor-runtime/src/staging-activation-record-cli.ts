import { createActivationRecord, writeActivationRecord } from './staging-activation-record.js';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const outputPath = process.env.NOVA_STAGING_ACTIVATION_PATH ?? 'evidence/sprint-015-activation.json';
const providerMode = required('NOVA_PROVIDER_MODE');
if (providerMode !== 'mock' && providerMode !== 'disabled') {
  throw new Error('NOVA_PROVIDER_MODE must be mock or disabled');
}

const record = await createActivationRecord({
  validationEvidencePath: required('NOVA_STAGING_EVIDENCE_PATH'),
  outputPath,
  serviceId: required('NOVA_RAILWAY_SERVICE_ID'),
  deploymentId: required('NOVA_RAILWAY_DEPLOYMENT_ID'),
  commitSha: required('NOVA_DEPLOYMENT_COMMIT_SHA'),
  migrationId: required('NOVA_STAGING_MIGRATION_ID'),
  migrationApplied: process.env.NOVA_STAGING_MIGRATION_APPLIED === 'true',
  providerMode,
  rollbackTested: process.env.NOVA_STAGING_ROLLBACK_TESTED === 'true',
  rollbackEvidenceReference: required('NOVA_STAGING_ROLLBACK_EVIDENCE'),
  operatorName: required('NOVA_STAGING_OPERATOR'),
  operatorDecision: process.env.NOVA_STAGING_OPERATOR_DECISION === 'accepted' ? 'accepted' : 'rejected',
  operatorNotes: process.env.NOVA_STAGING_OPERATOR_NOTES,
});

await writeActivationRecord(outputPath, record);
console.log(JSON.stringify(record, null, 2));
