import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { StagingEvidence } from './staging-validation.js';

export interface StagingActivationRecord {
  schemaVersion: '1.0';
  release: 'nova-release-1';
  sprint: '015';
  environment: 'staging';
  generatedAt: string;
  deployment: {
    provider: 'railway';
    serviceId: string;
    deploymentId: string;
    commitSha: string;
    privateTarget: true;
  };
  database: {
    isolated: true;
    migrationId: string;
    migrationApplied: boolean;
  };
  controls: {
    providerMode: 'mock' | 'disabled';
    externalWritesEnabled: false;
    publicTrafficEnabled: false;
    productionCredentialsPresent: false;
  };
  validation: StagingEvidence;
  rollback: {
    tested: boolean;
    evidenceReference: string;
  };
  operator: {
    name: string;
    decision: 'accepted' | 'rejected';
    notes: string;
  };
}

export interface ActivationInputs {
  validationEvidencePath: string;
  outputPath: string;
  serviceId: string;
  deploymentId: string;
  commitSha: string;
  migrationId: string;
  migrationApplied: boolean;
  providerMode: 'mock' | 'disabled';
  rollbackTested: boolean;
  rollbackEvidenceReference: string;
  operatorName: string;
  operatorDecision: 'accepted' | 'rejected';
  operatorNotes?: string;
  now?: () => Date;
}

export async function createActivationRecord(inputs: ActivationInputs): Promise<StagingActivationRecord> {
  const validation = JSON.parse(await readFile(inputs.validationEvidencePath, 'utf8')) as StagingEvidence;
  const acceptanceAllowed =
    validation.status === 'pass' &&
    validation.environment === 'staging' &&
    validation.externalWritesEnabled === false &&
    inputs.migrationApplied &&
    inputs.rollbackTested &&
    inputs.operatorDecision === 'accepted';

  if (!acceptanceAllowed) {
    throw new Error('Sprint 015 activation acceptance denied: required evidence or controls are incomplete');
  }

  return {
    schemaVersion: '1.0',
    release: 'nova-release-1',
    sprint: '015',
    environment: 'staging',
    generatedAt: (inputs.now ?? (() => new Date()))().toISOString(),
    deployment: {
      provider: 'railway',
      serviceId: inputs.serviceId,
      deploymentId: inputs.deploymentId,
      commitSha: inputs.commitSha,
      privateTarget: true,
    },
    database: {
      isolated: true,
      migrationId: inputs.migrationId,
      migrationApplied: true,
    },
    controls: {
      providerMode: inputs.providerMode,
      externalWritesEnabled: false,
      publicTrafficEnabled: false,
      productionCredentialsPresent: false,
    },
    validation,
    rollback: {
      tested: true,
      evidenceReference: inputs.rollbackEvidenceReference,
    },
    operator: {
      name: inputs.operatorName,
      decision: 'accepted',
      notes: inputs.operatorNotes ?? '',
    },
  };
}

export async function writeActivationRecord(path: string, record: StagingActivationRecord): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
}
