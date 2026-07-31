import type { Session } from "./domain.js";
import { DurableSessionCoordinator } from "./durable-session-coordinator.js";
import type { InMemorySessionStore } from "./session-store.js";

export type SessionPersistenceMode = "memory" | "durable-staging";

export interface SessionPersistenceEvidence {
  operation: "created" | "recovered" | "committed" | "rollback";
  sessionId: string;
  mode: SessionPersistenceMode;
  durableVersion?: number;
  recordedAt: string;
}

export class SessionPersistenceController {
  readonly #evidence: SessionPersistenceEvidence[] = [];

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

  async recordCreated(session: Session): Promise<void> {
    if (this.mode === "memory") return;
    const stored = await this.durable.recordCreated(session);
    this.record("created", session.id, stored.version);
  }

  async ensureLoaded(sessionId: string): Promise<Session | null> {
    const cached = this.sessions.get(sessionId);
    if (cached || this.mode === "memory") return cached;
    const recovered = await this.durable.ensureLoaded(sessionId);
    if (recovered) this.record("recovered", sessionId);
    return recovered;
  }

  async commit(sessionId: string): Promise<void> {
    if (this.mode === "memory") return;
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error("Session persistence commit requires an active runtime session");
    const stored = await this.durable.commit(session);
    this.record("committed", sessionId, stored.version);
  }

  rollbackToMemory(): void {
    this.mode = "memory";
    this.record("rollback", "runtime");
  }

  private record(
    operation: SessionPersistenceEvidence["operation"],
    sessionId: string,
    durableVersion?: number,
  ): void {
    this.#evidence.push({
      operation,
      sessionId,
      mode: this.mode,
      durableVersion,
      recordedAt: new Date().toISOString(),
    });
  }
}
