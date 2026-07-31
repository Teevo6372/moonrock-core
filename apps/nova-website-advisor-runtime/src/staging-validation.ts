import { writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { mkdir } from 'node:fs/promises';

export type ValidationStatus = 'pass' | 'fail';

export interface ValidationCheck {
  name: string;
  status: ValidationStatus;
  durationMs: number;
  detail: string;
}

export interface StagingEvidence {
  schemaVersion: '1.0';
  release: 'nova-release-1';
  environment: 'staging';
  generatedAt: string;
  baseUrl: string;
  providerMode: 'mock';
  externalWritesEnabled: false;
  status: ValidationStatus;
  checks: ValidationCheck[];
}

export interface ValidationOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

async function httpCheck(
  name: string,
  url: string,
  fetchImpl: typeof fetch,
  predicate: (response: Response, body: unknown) => boolean,
): Promise<ValidationCheck> {
  const started = performance.now();
  try {
    const response = await fetchImpl(url, { headers: { accept: 'application/json' } });
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    const passed = predicate(response, body);
    return {
      name,
      status: passed ? 'pass' : 'fail',
      durationMs: Math.round(performance.now() - started),
      detail: passed ? `HTTP ${response.status}` : `Unexpected response: HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      name,
      status: 'fail',
      durationMs: Math.round(performance.now() - started),
      detail: error instanceof Error ? error.message : 'Unknown validation error',
    };
  }
}

export async function runStagingValidation(options: ValidationOptions): Promise<StagingEvidence> {
  const baseUrl = options.baseUrl.replace(/\/$/, '');
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? (() => new Date());

  const checks = await Promise.all([
    httpCheck('health', `${baseUrl}/health`, fetchImpl, (response) => response.ok),
    httpCheck('readiness', `${baseUrl}/readiness`, fetchImpl, (response, body) => {
      if (!response.ok || typeof body !== 'object' || body === null) return false;
      const record = body as Record<string, unknown>;
      return record.ready !== false;
    }),
    httpCheck('provider-isolation', `${baseUrl}/readiness`, fetchImpl, (response, body) => {
      if (!response.ok || typeof body !== 'object' || body === null) return false;
      const record = body as Record<string, unknown>;
      const provider = record.providerMode ?? record.provider ?? record.modelProvider;
      return provider === undefined || provider === 'mock' || provider === 'disabled';
    }),
  ]);

  return {
    schemaVersion: '1.0',
    release: 'nova-release-1',
    environment: 'staging',
    generatedAt: now().toISOString(),
    baseUrl,
    providerMode: 'mock',
    externalWritesEnabled: false,
    status: checks.every((check) => check.status === 'pass') ? 'pass' : 'fail',
    checks,
  };
}

export async function writeStagingEvidence(path: string, evidence: StagingEvidence): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

export function assertAccepted(evidence: StagingEvidence): void {
  if (evidence.status !== 'pass') {
    const failed = evidence.checks.filter((check) => check.status === 'fail').map((check) => check.name);
    throw new Error(`Staging acceptance failed: ${failed.join(', ')}`);
  }
}
