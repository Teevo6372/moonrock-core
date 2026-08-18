import { serve } from "@hono/node-server";
import { resolve } from "node:path";
import { Pool } from "pg";
import { corsHeaders, isOriginAllowed, parseAllowedOrigins } from "./cors-policy.js";
import { SessionGroundedNovaConversationEngine } from "./dynamic-conversation-engine.js";
import { MOONROCK_PRODUCTION_GHL_FIELD_REGISTRY } from "./ghl-production-registry.js";
import { loadGhlRuntimeConfig } from "./ghl-runtime-config.js";
import { GroqConversationGenerator } from "./groq-conversation-generator.js";
import { createMoonrock2App } from "./http/moonrock2-app.js";
import { runMigrations } from "./migrations.js";
import { PostgresDiscoveryStateRepository } from "./postgres-discovery-state.js";
import { PostgresDurableStateRepository } from "./postgres-durable-state.js";

const port = Number(process.env.PORT ?? process.env.NOVA_LOCAL_PORT ?? "8787");
const hostname = process.env.NOVA_BIND_HOST ?? (process.env.RAILWAY_ENVIRONMENT ? "0.0.0.0" : "127.0.0.1");

async function start(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  let repository: PostgresDurableStateRepository | undefined;
  let pool: Pool | undefined;
  if (databaseUrl) {
    pool = new Pool({ connectionString: databaseUrl, max: boundedInteger(process.env.NOVA_DATABASE_POOL_MAX, 4, 1, 10), ssl: process.env.NOVA_DATABASE_SSL_MODE === "require" ? { rejectUnauthorized: true } : undefined });
    if (process.env.NOVA_RUN_MIGRATIONS !== "true") { await pool.end(); throw new Error("DATABASE_URL requires NOVA_RUN_MIGRATIONS=true until the schema is verified"); }
    await runMigrations(pool, resolve(process.cwd(), process.env.NOVA_MIGRATIONS_DIRECTORY ?? "migrations"));
    repository = new PostgresDurableStateRepository(pool);
    await repository.verifyConnection();
    process.stdout.write("Nova PostgreSQL adapters verified\n");
  }

  const allowedOrigins = parseAllowedOrigins(process.env.NOVA_ALLOWED_ORIGINS);
  const ghlHandoffEnabled = process.env.NOVA_GHL_HANDOFF_ENABLED === "true";
  const ghlWritesEnabled = process.env.NOVA_GHL_WRITES_ENABLED === "true";
  const ghlFieldsVerified = process.env.NOVA_GHL_FIELDS_VERIFIED === "true";
  const productionGhl = ghlHandoffEnabled ? (() => {
    const runtime = loadGhlRuntimeConfig();
    return { enabled: true, fieldsVerified: ghlFieldsVerified, writesEnabled: ghlWritesEnabled, locationId: runtime.locationId, accessToken: runtime.privateIntegrationToken, baseUrl: runtime.baseUrl, fieldRegistry: MOONROCK_PRODUCTION_GHL_FIELD_REGISTRY };
  })() : undefined;

  const groqApiKey = process.env.GROQ_API_KEY?.trim();
  const llmEnabled = process.env.NOVA_LLM_ENABLED === "true" && Boolean(groqApiKey);
  const conversationEngine = new SessionGroundedNovaConversationEngine(llmEnabled ? new GroqConversationGenerator({
    apiKey: groqApiKey!,
    model: process.env.NOVA_LLM_MODEL ?? "openai/gpt-oss-120b",
    baseUrl: process.env.NOVA_LLM_BASE_URL ?? "https://api.groq.com/openai/v1",
    timeoutMs: boundedInteger(process.env.NOVA_LLM_TIMEOUT_MS, 12000, 1000, 30000),
  }) : undefined);
  process.stdout.write(`Nova conversation provider: ${llmEnabled ? `Groq/${process.env.NOVA_LLM_MODEL ?? "openai/gpt-oss-120b"}` : "grounded fallback"}\n`);

  const { app } = createMoonrock2App({ allowedOrigins, ...(pool ? { discoveryRepository: new PostgresDiscoveryStateRepository(pool) } : {}), ...(productionGhl ? { productionGhl } : {}), conversationEngine });
  const fetch = async (request: Request): Promise<Response> => {
    const origin = request.headers.get("origin");
    const originAllowed = isOriginAllowed(origin, allowedOrigins);
    if (request.method === "OPTIONS" && originAllowed) return new Response(null, { status: 204, headers: corsHeaders(origin) });
    const response = await app.fetch(request);
    if (!originAllowed) return response;
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(corsHeaders(origin))) headers.set(name, value);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  };
  const server = serve({ fetch, hostname, port }, (info) => process.stdout.write(`Nova Moonrock 2 runtime listening on ${hostname}:${info.port}\n`));
  const close = (): void => { server.close(() => { void repository?.close().finally(() => process.exit(0)); if (!repository) process.exit(0); }); };
  process.once("SIGTERM", close); process.once("SIGINT", close);
}

function boundedInteger(raw: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const value = Number(raw ?? fallback);
  if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(`Expected an integer between ${minimum} and ${maximum}`);
  return value;
}

start().catch((error: unknown) => { process.stderr.write(`Nova startup failed: ${error instanceof Error ? error.message : "unknown error"}\n`); process.exit(1); });
