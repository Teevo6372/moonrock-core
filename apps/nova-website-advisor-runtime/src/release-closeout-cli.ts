import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { assertReleaseClosed, buildReleaseCloseout } from './release-closeout.js';

function envBool(name: string): boolean {
  return process.env[name]?.toLowerCase() === 'true';
}

const outputPath = process.env.NOVA_RELEASE_CLOSEOUT_PATH ?? 'evidence/release-1-closeout.json';
const productionApprover = process.env.NOVA_PRODUCTION_APPROVER;
const productionApprovalReference = process.env.NOVA_PRODUCTION_APPROVAL_REFERENCE;
const record = buildReleaseCloseout({
  release: 'nova-release-1',
  environment: 'staging',
  sprint014EvidencePresent: envBool('NOVA_SPRINT014_EVIDENCE_PRESENT'),
  sprint015ActivationRecordPresent: envBool('NOVA_SPRINT015_ACTIVATION_PRESENT'),
  operatorHandoffComplete: envBool('NOVA_OPERATOR_HANDOFF_COMPLETE'),
  unresolvedCriticalRisks: Number(process.env.NOVA_UNRESOLVED_CRITICAL_RISKS ?? '0'),
  productionDecision: process.env.NOVA_PRODUCTION_DECISION === 'authorized' ? 'authorized' : 'not-authorized',
  ...(productionApprover ? { productionApprover } : {}),
  ...(productionApprovalReference ? { productionApprovalReference } : {}),
});

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(record, null, 2));
assertReleaseClosed(record);
