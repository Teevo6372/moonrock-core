import { assertAccepted, runStagingValidation, writeStagingEvidence } from './staging-validation.js';

const baseUrl = process.env.NOVA_STAGING_BASE_URL;
const outputPath = process.env.NOVA_STAGING_EVIDENCE_PATH ?? 'evidence/staging-validation.json';

if (!baseUrl) {
  console.error('NOVA_STAGING_BASE_URL is required.');
  process.exitCode = 2;
} else {
  const evidence = await runStagingValidation({ baseUrl });
  await writeStagingEvidence(outputPath, evidence);
  console.log(JSON.stringify(evidence, null, 2));
  try {
    assertAccepted(evidence);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
