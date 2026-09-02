import {
  readOperatorReleaseEnvelope,
  readOperatorReleaseEnvironment,
} from "./lib/operator-release";
import { runProductionPilot } from "./lib/production-pilot";

function requireMarker(): string {
  const marker = process.env.MOONROCK_PRODUCTION_MARKER?.trim();
  if (!marker) {
    throw new Error("production_pilot_env_missing:MOONROCK_PRODUCTION_MARKER");
  }
  return marker;
}

async function main(): Promise<void> {
  const inputPath = process.argv[2];
  if (!inputPath) {
    throw new Error("production_pilot_input_required");
  }

  const envelope = await readOperatorReleaseEnvelope(inputPath);
  const environment = readOperatorReleaseEnvironment(process.env);
  const result = await runProductionPilot({
    envelope,
    environment,
    expectedContentMarker: requireMarker(),
  });

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

  if (result.status === "blocked") {
    process.exitCode = 2;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "production_pilot_failed";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
