import {
  readOperatorReleaseEnvelope,
  readOperatorReleaseEnvironment,
  runOperatorProductionRelease,
} from "./lib/operator-release";

async function main(): Promise<void> {
  const inputPath = process.argv[2];
  if (!inputPath) {
    throw new Error("operator_release_input_required");
  }

  const envelope = await readOperatorReleaseEnvelope(inputPath);
  const environment = readOperatorReleaseEnvironment(process.env);
  const result = await runOperatorProductionRelease(envelope, environment);

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "operator_release_failed";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
