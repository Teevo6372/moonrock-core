import type { Session } from "./domain.js";
import { DurableSessionCoordinator } from "./durable-session-coordinator.js";
import type { InMemorySessionStore } from "./session-store.js";

export type SessionPersistenceMode = "memory" | "durable-staging";
export type SessionPersistenceOperation =
  | "created"
  | "recovered"
  | "committed"
  | "rollback"
  | "transaction_failed";

export interface SessionPersistenceEvidence {
  operation: SessionPersistenceOperation;
  sessionId: string;
  mode: SessionPersistenceMode;
  durableVersion?: number;
  durationMs?: number;
  reason?: string;
  recordedAt: string;
}

export interface SessionPersistenceMetrics {
  persistenceLatencyMs: number[];
  recoveryLatencyMs: number[];
  transactionSuccessCount: number;
  transactionFailureCount: number;
  optimisticConflictCount: number;
  rollbackCount: number;
  recoverySuccessCount: number;
}

export class SessionPersistenceController {
  readonly #evidence: SessionPersistenceEvidence[] = [];
  readonly #metrics: SessionPersistenceMetrics = {
    persistenceLatencyMs: [],
    recoveryLatencyMs: [],
    transactionSuccessCount: 0,
    transactionFailureCount: 0,
    optimisticConflictCount: 0,
    rollbackCount: 0,
    recoverySuccessCount: 0,
  };

  constructor(
    private mode: SessionPersistenceMode,
    private readonly sessions: InMemorySessionStore,
    private readonly durable: DurableSessionCoordinator,
  ) {}

  get currentMode(): SessionPersistenceMode {
    return this.mode;
  }

  get evidence(): readonly SessionPersistenceEvidence[] {
    return structuredClone(this.#evidence);
  }

  get metrics(): Readonly<SessionPersistenceMetrics> {
    return structuredClone(this.#metrics);
  }

  async recordCreated(session: Session): Promise<void> {
    if (this.mode === "memory") return;
    const startedAt = performance.now();
    const stored = await this.durable.recordCreated(session);
    const durationMs = performance.now() - startedAt;
    this.#metrics.persistenceLatencyMs.push(durationMs);
    this.record("created", session.id, stored.version, durationMs);
  }

  async ensureLoaded(sessionId: string): Promise<Session | null> {
    const cached = this.sessions.get(sessionId);
    if (cached || this.mode === "memory") return cached;
    const startedAt = performance.now();
    const recovered = await this.durable.ensureLoaded(sessionId);
    const durationMs = performance.now() - startedAt;
    this.#metrics.recoveryLatencyMs.push(durationMs);
    if (recovered) {
      this.#metrics.recoverySuccessCount += 1;
      this.record("recovered", sessionId, undefined, durationMs);
    }
    return recovered;
  }

  async commit(sessionId: string): Promise<void> {
    if (this.mode === "memory") return;
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error("Session persistence commit requires an active runtime session");
    const startedAt = performance.now();
    try {
      const stored = await this.durable.commit(session);
      const durationMs = performance.now() - startedAt;
      this.#metrics.persistenceLatencyMs.push(durationMs);
      this.record("committed", sessionId, stored.version, durationMs);
    } catch (error) {
      if (/version|conflict/i.test(error instanceof Error ? error.message : String(error))) {
        this.#metrics.optimisticConflictCount += 1;
      }
      throw error;
    }
  }

  async transact<T>(sessionId: string, operation: () => Promise<T> | T): Promise<T> {
    await this.ensureLoaded(sessionId);
    try {
      const result = await operation();
      await this.commit(sessionId);
      this.#metrics.transactionSuccessCount += 1;
      return result;
    } catch (error) {
      this.#metrics.transactionFailureCount += 1;
      this.record(
        "transaction_failed",
        sessionId,
        undefined,
        undefined,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  async transactCreate<T>(operation: () => Promise<{ session: Session; result: T }> | { session: Session; result: T }): Promise<T> {
    try {
      const { session, result } = await operation();
      await this.recordCreated(session);
      this.#metrics.transactionSuccessCount += 1;
      return result;
    } catch (error) {
      this.#metrics.transactionFailureCount += 1;
      this.record(
        "transaction_failed",
        "uncommitted-create",
        undefined,
        undefined,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  rollbackToMemory(): void {
    this.mode = "memory";
    this.#metrics.rollbackCount += 1;
    this.record("rollback", "runtime");
  }

  private record(
    operation: SessionPersistenceOperation,
    sessionId: string,
    durableVersion?: number,
    durationMs?: number,
    reason?: string,
  ): void {
    this.#evidence.push({
      operation,
      sessionId,
      mode: this.mode,
      durableVersion,
      durationMs,
      reason,
      recordedAt: new Date().toISOString(),
    });
  }
}
