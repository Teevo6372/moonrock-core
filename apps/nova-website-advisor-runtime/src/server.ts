import { serve } from "@hono/node-server";
import { resolve } from "node:path";
import { Pool } from "pg";
import { createApp } from "./http/app.js";
import { runMigrations } from "./migrations.js";
import { PostgresDurableStateRepository } from "./postgres-durable-state.js";

const port = Number(process.env.NOVA_LOCAL_PORT ?? "8787");
const hostname = process.env.NOVA_BIND_HOST ?? "127.0.0.1";

async function start(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  let repository: PostgresDurableStateRepository | undefined;
  if (databaseUrl) {
    const pool = new Pool({
      connectionString: databaseUrl,
      max: boundedInteger(process.env.NOVA_DATABASE_POOL_MAX, 4, 1, 10),
      ssl: process.env.NOVA_DATABASE_SSL_MODE === "require"
        ? { rejectUnauthorized: true }
        : undefined,
    });
    if (process.env.NOVA_RUN_MIGRATIONS !== "true") {
      await pool.end();
      throw new Error(
        "DATABASE_URL requires NOVA_RUN_MIGRATIONS=true until the schema is verified",
      );
    }
    await runMigrations(
      pool,
      resolve(process.cwd(), process.env.NOVA_MIGRATIONS_DIRECTORY ?? "migrations"),
    );
    repository = new PostgresDurableStateRepository(pool);
    await repository.verifyConnection();
    process.stdout.write(
      "Nova durable-state adapter verified; session cutover remains disabled\n",
    );
  }

  const { app } = createApp();
  const server = serve({ fetch: app.fetch, hostname, port }, (info) => {
    process.stdout.write(
      `Nova provider-disconnected runtime listening on ${hostname}:${info.port}\n`,
    );
  });
  const close = (): void => {
    server.close(() => {
      void repository?.close().finally(() => process.exit(0));
    });
  };
  process.once("SIGTERM", close);
  process.once("SIGINT", close);
}

function boundedInteger(
  raw: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const value = Number(raw ?? fallback);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`Expected an integer between ${minimum} and ${maximum}`);
  }
  return value;
}

start().catch((error: unknown) => {
  process.stderr.write(
    `Nova startup failed: ${error instanceof Error ? error.message : "unknown error"}\n`,
  );
  process.exit(1);
});
