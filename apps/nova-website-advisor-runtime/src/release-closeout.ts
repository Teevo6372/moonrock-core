export type CloseoutDecision = 'complete' | 'incomplete';
export type ProductionDecision = 'not-authorized' | 'authorized';

export interface ReleaseCloseoutInput {
  release: 'nova-release-1';
  environment: 'staging';
  sprint014EvidencePresent: boolean;
  sprint015ActivationRecordPresent: boolean;
  operatorHandoffComplete: boolean;
  unresolvedCriticalRisks: number;
  productionDecision: ProductionDecision;
  productionApprover?: string;
  productionApprovalReference?: string;
  generatedAt?: string;
}

export interface ReleaseCloseoutRecord extends ReleaseCloseoutInput {
  schemaVersion: '1.0';
  closeoutDecision: CloseoutDecision;
  productionAuthorized: boolean;
  blockers: string[];
  generatedAt: string;
}

export function buildReleaseCloseout(input: ReleaseCloseoutInput): ReleaseCloseoutRecord {
  const blockers: string[] = [];
  if (!input.sprint014EvidencePresent) blockers.push('sprint-014-evidence-missing');
  if (!input.sprint015ActivationRecordPresent) blockers.push('sprint-015-activation-record-missing');
  if (!input.operatorHandoffComplete) blockers.push('operator-handoff-incomplete');
  if (input.unresolvedCriticalRisks > 0) blockers.push('unresolved-critical-risks');

  const productionAuthorized =
    input.productionDecision === 'authorized' &&
    Boolean(input.productionApprover?.trim()) &&
    Boolean(input.productionApprovalReference?.trim());

  if (input.productionDecision === 'authorized' && !productionAuthorized) {
    blockers.push('production-authorization-evidence-incomplete');
  }

  return {
    ...input,
    schemaVersion: '1.0',
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    closeoutDecision: blockers.length === 0 ? 'complete' : 'incomplete',
    productionAuthorized,
    blockers,
  };
}

export function assertReleaseClosed(record: ReleaseCloseoutRecord): void {
  if (record.closeoutDecision !== 'complete') {
    throw new Error(`Release closeout failed: ${record.blockers.join(', ')}`);
  }
}

export function assertProductionAuthorized(record: ReleaseCloseoutRecord): void {
  if (!record.productionAuthorized) {
    throw new Error('Production activation is not authorized by this closeout record');
  }
}
