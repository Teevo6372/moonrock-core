import type { Session } from "./domain.js";
import type { DurableStateRepository, SessionVersion } from "./durable-state.js";

export interface SessionCache {
  restore(session: Session): Session;
  get(id: string, now?: Date): Session | null;
}

export class DurableSessionCoordinator {
  readonly #versions = new Map<string, number>();

  constructor(
    private readonly repository: DurableStateRepository,
    private readonly cache: SessionCache,
  ) {}

  async recordCreated(session: Session): Promise<SessionVersion> {
    const stored = await this.repository.createSession(session);
    this.#versions.set(session.id, stored.version);
    return stored;
  }

  async recover(sessionId: string): Promise<Session | null> {
    const stored = await this.repository.loadSession(sessionId);
    if (!stored) return null;
    this.#versions.set(sessionId, stored.version);
    return this.cache.restore(stored.session);
  }

  async ensureLoaded(sessionId: string): Promise<Session | null> {
    const cached = this.cache.get(sessionId);
    if (cached) return cached;
    return this.recover(sessionId);
  }

  async commit(session: Session): Promise<SessionVersion> {
    const expectedVersion = this.#versions.get(session.id);
    if (expectedVersion === undefined) {
      throw new Error("Durable session version is unavailable; recovery is required");
    }
    const stored = await this.repository.saveSession(session, expectedVersion);
    this.#versions.set(session.id, stored.version);
    return stored;
  }

  forget(sessionId: string): void {
    this.#versions.delete(sessionId);
  }
}
