import { inspectHighLevelLocation } from "./ghl-location-inspector.js";
import { resolveGhlFieldRegistry } from "./ghl-registry-resolver.js";
import { loadGhlRuntimeConfig, redactedGhlRuntimeConfig } from "./ghl-runtime-config.js";

async function main(): Promise<void> {
  const config = loadGhlRuntimeConfig();
  const inspection = await inspectHighLevelLocation({
    locationId: config.locationId,
    accessToken: config.privateIntegrationToken,
    baseUrl: config.baseUrl,
  });
  const resolution = resolveGhlFieldRegistry(inspection);
  const safe = {
    config: redactedGhlRuntimeConfig(config),
    location: inspection.location,
    pipelines: inspection.pipelines,
    customFields: inspection.customFields,
    registry: resolution,
    inspectedAt: inspection.inspectedAt,
  };
  process.stdout.write(`${JSON.stringify(safe, null, 2)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown GHL inspection failure";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
