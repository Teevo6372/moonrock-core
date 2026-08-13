import { serve } from "@hono/node-server";
import { resolve } from "node:path";
import { Pool } from "pg";
import { createMoonrock2App } from "./http/moonrock2-app.js";
import { runMigrations } from "./migrations.js";
import { PostgresDiscoveryStateRepository } from "./postgres-discovery-state.js";
import { PostgresDurableStateRepository } from "./postgres-durable-state.js";

const port = Number(process.env.PORT ?? process.env.NOVA_LOCAL_PORT ?? "8787");
const hostname = process.env.NOVA_BIND_HOST ?? (process.env.RAILWAY_ENVIRONMENT ? "0.0.0.0" : "127.0.0.1");
const localOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8787",
  "http://127.0.0.1:8787",
];

async function start(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  let repository: PostgresDurableStateRepository | undefined;
  let pool: Pool | undefined;
  if (databaseUrl) {
    pool = new Pool({
      connectionString: databaseUrl,
      max: boundedInteger(process.env.NOVA_DATABASE_POOL_MAX, 4, 1, 10),
      ssl: process.env.NOVA_DATABASE_SSL_MODE === "require" ? { rejectUnauthorized: true } : undefined,
    });
    if (process.env.NOVA_RUN_MIGRATIONS !== "true") {
      await pool.end();
      throw new Error("DATABASE_URL requires NOVA_RUN_MIGRATIONS=true until the schema is verified");
    }
    await runMigrations(pool, resolve(process.cwd(), process.env.NOVA_MIGRATIONS_DIRECTORY ?? "migrations"));
    repository = new PostgresDurableStateRepository(pool);
    await repository.verifyConnection();
    process.stdout.write("Nova PostgreSQL adapters verified\n");
  }

  const allowedOrigins = parseAllowedOrigins(process.env.NOVA_ALLOWED_ORIGINS);
  const { app } = createMoonrock2App({
    allowedOrigins,
    ...(pool ? { discoveryRepository: new PostgresDiscoveryStateRepository(pool) } : {}),
  });
  const fetch = async (request: Request): Promise<Response> => {
    const origin = request.headers.get("origin");
    const originAllowed = origin !== null && allowedOrigins.includes(origin);
    if (request.method === "OPTIONS" && originAllowed) {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    const response = await app.fetch(request);
    if (!originAllowed) return response;
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(corsHeaders(origin))) headers.set(name, value);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  };
  const server = serve({ fetch, hostname, port }, (info) => {
    process.stdout.write(`Nova Moonrock 2 runtime listening on ${hostname}:${info.port}\n`);
  });
  const close = (): void => {
    server.close(() => {
      void repository?.close().finally(() => process.exit(0));
      if (!repository) process.exit(0);
    });
  };
  process.once("SIGTERM", close);
  process.once("SIGINT", close);
}

function parseAllowedOrigins(raw: string | undefined): string[] {
  const configured = (raw ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);
  for (const origin of configured) {
    const parsed = new URL(origin);
    if (parsed.origin !== origin || !["http:", "https:"].includes(parsed.protocol)) throw new Error(`NOVA_ALLOWED_ORIGINS contains an invalid origin: ${origin}`);
  }
  return [...new Set([...localOrigins, ...configured])];
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,x-correlation-id,last-event-id",
    "access-control-max-age": "600",
    vary: "Origin",
  };
}

function boundedInteger(raw: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const value = Number(raw ?? fallback);
  if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(`Expected an integer between ${minimum} and ${maximum}`);
  return value;
}

start().catch((error: unknown) => {
  process.stderr.write(`Nova startup failed: ${error instanceof Error ? error.message : "unknown error"}\n`);
  process.exit(1);
});
