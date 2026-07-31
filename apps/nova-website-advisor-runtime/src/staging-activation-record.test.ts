import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createActivationRecord } from './staging-activation-record.js';
import type { StagingEvidence } from './staging-validation.js';

async function evidenceFile(status: 'pass' | 'fail'): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'nova-sprint-015-'));
  const path = join(dir, 'validation.json');
  const evidence: StagingEvidence = {
    schemaVersion: '1.0',
    release: 'nova-release-1',
    environment: 'staging',
    generatedAt: '2026-07-31T00:00:00.000Z',
    baseUrl: 'https://private.example.test',
    providerMode: 'mock',
    externalWritesEnabled: false,
    status,
    checks: [{ name: 'health', status, durationMs: 1, detail: status }],
  };
  await writeFile(path, JSON.stringify(evidence), 'utf8');
  return path;
}

describe('createActivationRecord', () => {
  it('creates a controlled activation record only when all gates pass', async () => {
    const record = await createActivationRecord({
      validationEvidencePath: await evidenceFile('pass'),
      outputPath: 'unused.json',
      serviceId: 'svc-staging',
      deploymentId: 'dep-123',
      commitSha: 'abc123',
      migrationId: '001_staging_state',
      migrationApplied: true,
      providerMode: 'mock',
      rollbackTested: true,
      rollbackEvidenceReference: 'rollback-001.json',
      operatorName: 'operator',
      operatorDecision: 'accepted',
      now: () => new Date('2026-07-31T01:00:00.000Z'),
    });

    expect(record.operator.decision).toBe('accepted');
    expect(record.controls.publicTrafficEnabled).toBe(false);
    expect(record.controls.externalWritesEnabled).toBe(false);
    expect(record.deployment.privateTarget).toBe(true);
  });

  it('fails closed when validation is not passing', async () => {
    await expect(createActivationRecord({
      validationEvidencePath: await evidenceFile('fail'),
      outputPath: 'unused.json',
      serviceId: 'svc-staging',
      deploymentId: 'dep-123',
      commitSha: 'abc123',
      migrationId: '001_staging_state',
      migrationApplied: true,
      providerMode: 'mock',
      rollbackTested: true,
      rollbackEvidenceReference: 'rollback-001.json',
      operatorName: 'operator',
      operatorDecision: 'accepted',
    })).rejects.toThrow('acceptance denied');
  });
});
