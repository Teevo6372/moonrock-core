import { describe, expect, it } from 'vitest';
import {
  assertProductionAuthorized,
  assertReleaseClosed,
  buildReleaseCloseout,
} from './release-closeout.js';

const base = {
  release: 'nova-release-1' as const,
  environment: 'staging' as const,
  sprint014EvidencePresent: true,
  sprint015ActivationRecordPresent: true,
  operatorHandoffComplete: true,
  unresolvedCriticalRisks: 0,
};

describe('Release 1 closeout', () => {
  it('closes staging while production remains explicitly unauthorized', () => {
    const record = buildReleaseCloseout({
      ...base,
      productionDecision: 'not-authorized',
      generatedAt: '2026-07-31T00:00:00.000Z',
    });

    expect(record.closeoutDecision).toBe('complete');
    expect(record.productionAuthorized).toBe(false);
    expect(() => assertReleaseClosed(record)).not.toThrow();
    expect(() => assertProductionAuthorized(record)).toThrow(/not authorized/);
  });

  it('fails closeout when required evidence or handoff is missing', () => {
    const record = buildReleaseCloseout({
      ...base,
      sprint014EvidencePresent: false,
      operatorHandoffComplete: false,
      unresolvedCriticalRisks: 1,
      productionDecision: 'not-authorized',
    });

    expect(record.closeoutDecision).toBe('incomplete');
    expect(record.blockers).toEqual([
      'sprint-014-evidence-missing',
      'operator-handoff-incomplete',
      'unresolved-critical-risks',
    ]);
    expect(() => assertReleaseClosed(record)).toThrow(/closeout failed/);
  });

  it('requires named, referenced approval before production authorization', () => {
    const incomplete = buildReleaseCloseout({
      ...base,
      productionDecision: 'authorized',
    });
    expect(incomplete.productionAuthorized).toBe(false);
    expect(incomplete.blockers).toContain('production-authorization-evidence-incomplete');

    const authorized = buildReleaseCloseout({
      ...base,
      productionDecision: 'authorized',
      productionApprover: 'Moonrock authorized operator',
      productionApprovalReference: 'separate-production-authorization-record',
    });
    expect(authorized.productionAuthorized).toBe(true);
    expect(() => assertProductionAuthorized(authorized)).not.toThrow();
  });
});
