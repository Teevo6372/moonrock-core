import type { DurableStateRepository } from "./durable-state.js";

export type SessionPersistenceMode = "memory" | "postgres";

export interface SessionCutoverDecision {
  mode: SessionPersistenceMode;
  enabled: boolean;
  reasonCode: string;
}

export interface SessionCutoverEnvironment {
  NOVA_SESSION_PERSISTENCE?: string;
  NOVA_DURABLE_SESSION_CUTOVER?: string;
  NOVA_DURABLE_STATE_CONFORMANCE?: string;
  DATABASE_URL?: string;
}

export function decideSessionCutover(
  environment: SessionCutoverEnvironment,
): SessionCutoverDecision {
  const requestedMode = environment.NOVA_SESSION_PERSISTENCE ?? "memory";
  if (requestedMode !== "memory" && requestedMode !== "postgres") {
    throw new Error("NOVA_SESSION_PERSISTENCE must be memory or postgres");
  }
  if (requestedMode === "memory") {
    if (environment.NOVA_DURABLE_SESSION_CUTOVER === "true") {
      throw new Error("Durable cutover cannot be enabled while persistence mode is memory");
    }
    return { mode: "memory", enabled: false, reasonCode: "MEMORY_MODE" };
  }
  if (!environment.DATABASE_URL) {
    throw new Error("Postgres session persistence requires DATABASE_URL");
  }
  if (environment.NOVA_DURABLE_STATE_CONFORMANCE !== "passed") {
    throw new Error("Postgres session persistence requires a passed conformance gate");
  }
  if (environment.NOVA_DURABLE_SESSION_CUTOVER !== "true") {
    return { mode: "postgres", enabled: false, reasonCode: "CUTOVER_DISABLED" };
  }
  return { mode: "postgres", enabled: true, reasonCode: "CUTOVER_AUTHORIZED" };
}

export interface ConformanceResult {
  passed: boolean;
  checks: readonly string[];
}

export async function runDurableStateConformance(
  repository: DurableStateRepository,
  session: Parameters<DurableStateRepository["createSession"]>[0],
): Promise<ConformanceResult> {
  const checks: string[] = [];
  const created = await repository.createSession(session);
  if (created.version !== 1) throw new Error("Unexpected initial session version");
  checks.push("create-load-roundtrip");

  const loaded = await repository.loadSession(session.id);
  if (!loaded || loaded.session.correlationId !== session.correlationId) {
    throw new Error("Session roundtrip failed");
  }

  const nextSession = { ...loaded.session, sequence: loaded.session.sequence + 1 };
  const saved = await repository.saveSession(nextSession, loaded.version);
  if (saved.version !== loaded.version + 1) {
    throw new Error("Optimistic version increment failed");
  }
  checks.push("optimistic-versioning");

  let staleWriteRejected = false;
  try {
    await repository.saveSession(nextSession, loaded.version);
  } catch {
    staleWriteRejected = true;
  }
  if (!staleWriteRejected) throw new Error("Stale write was not rejected");
  checks.push("stale-write-rejection");

  const claim = await repository.claimIdempotency({
    scope: "sprint-009-conformance",
    key: session.id,
    correlationId: session.correlationId,
  });
  if (!claim.claimed) throw new Error("Initial idempotency claim failed");
  const replay = await repository.claimIdempotency({
    scope: "sprint-009-conformance",
    key: session.id,
    correlationId: session.correlationId,
  });
  if (replay.claimed) throw new Error("Idempotency replay was incorrectly claimed");
  checks.push("idempotent-replay");

  return { passed: true, checks };
}
