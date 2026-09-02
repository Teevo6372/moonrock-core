import { readFile } from "node:fs/promises";
import {
  parseOperatorRollbackEnvelope,
  readOperatorRollbackEnvironment,
  runOperatorRollback,
} from "./lib/operator-rollback";

async function main(): Promise<void> {
  const inputPath = process.argv[2];
  if (!inputPath) {
    throw new Error("operator_rollback_input_required");
  }

  const raw = await readFile(inputPath, "utf8");
  const envelope = parseOperatorRollbackEnvelope(JSON.parse(raw) as unknown);
  const environment = readOperatorRollbackEnvironment(process.env);
  const result = await runOperatorRollback(envelope, environment);

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "operator_rollback_failed";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
