import { describe, expect, it } from 'vitest';
import { assertAccepted, runStagingValidation } from './staging-validation.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('staging validation', () => {
  it('accepts a healthy mock-only staging runtime', async () => {
    const fetchImpl = async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith('/health')) return jsonResponse({ ok: true });
      return jsonResponse({ ready: true, providerMode: 'mock' });
    };

    const evidence = await runStagingValidation({
      baseUrl: 'https://nova-staging.internal/',
      fetchImpl: fetchImpl as typeof fetch,
      now: () => new Date('2026-07-30T12:00:00.000Z'),
    });

    expect(evidence.status).toBe('pass');
    expect(evidence.baseUrl).toBe('https://nova-staging.internal');
    expect(evidence.providerMode).toBe('mock');
    expect(evidence.externalWritesEnabled).toBe(false);
    expect(() => assertAccepted(evidence)).not.toThrow();
  });

  it('fails closed when readiness or provider isolation fails', async () => {
    const fetchImpl = async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith('/health')) return jsonResponse({ ok: true });
      return jsonResponse({ ready: false, providerMode: 'live' }, 503);
    };

    const evidence = await runStagingValidation({
      baseUrl: 'https://nova-staging.internal',
      fetchImpl: fetchImpl as typeof fetch,
    });

    expect(evidence.status).toBe('fail');
    expect(evidence.checks.filter((check) => check.status === 'fail').map((check) => check.name))
      .toEqual(['readiness', 'provider-isolation']);
    expect(() => assertAccepted(evidence)).toThrow(/readiness, provider-isolation/);
  });
});
