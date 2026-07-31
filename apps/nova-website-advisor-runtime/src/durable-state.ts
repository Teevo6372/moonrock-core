import type { ConsentCategory, ConsentStatus, Session } from "./domain.js";

export interface SessionVersion {
  session: Session;
  version: number;
}

export type IdempotencyState =
  | "claimed"
  | "confirmed"
  | "outcome_unknown";

export interface IdempotencyRecord {
  scope: string;
  key: string;
  state: IdempotencyState;
  correlationId: string;
  receiptId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DurableStateRepository {
  createSession(session: Session): Promise<SessionVersion>;
  loadSession(id: string): Promise<SessionVersion | null>;
  saveSession(session: Session, expectedVersion: number): Promise<SessionVersion>;
  appendConsent(input: {
    sessionId: string;
    category: ConsentCategory;
    status: Exclude<ConsentStatus, "not_requested">;
    actionId: string;
    occurredAt: string;
  }): Promise<void>;
  claimIdempotency(input: {
    scope: string;
    key: string;
    correlationId: string;
    now?: Date;
  }): Promise<{ claimed: boolean; record: IdempotencyRecord }>;
  completeIdempotency(input: {
    scope: string;
    key: string;
    state: Exclude<IdempotencyState, "claimed">;
    receiptId?: string;
    now?: Date;
  }): Promise<IdempotencyRecord>;
}

export class StateConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StateConflictError";
  }
}

export class InMemoryDurableStateRepository implements DurableStateRepository {
  readonly #sessions = new Map<string, SessionVersion>();
  readonly #consentActions = new Set<string>();
  readonly #idempotency = new Map<string, IdempotencyRecord>();

  async createSession(session: Session): Promise<SessionVersion> {
    if (this.#sessions.has(session.id)) {
      throw new StateConflictError("Session already exists");
    }
    const record = { session: structuredClone(session), version: 1 };
    this.#sessions.set(session.id, record);
    return structuredClone(record);
  }

  async loadSession(id: string): Promise<SessionVersion | null> {
    const record = this.#sessions.get(id);
    return record ? structuredClone(record) : null;
  }

  async saveSession(
    session: Session,
    expectedVersion: number,
  ): Promise<SessionVersion> {
    const current = this.#sessions.get(session.id);
    if (!current) throw new StateConflictError("Session does not exist");
    if (current.version !== expectedVersion) {
      throw new StateConflictError("Session version conflict");
    }
    if (session.sequence < current.session.sequence) {
      throw new StateConflictError("Session sequence cannot move backward");
    }
    const next = {
      session: structuredClone(session),
      version: current.version + 1,
    };
    this.#sessions.set(session.id, next);
    return structuredClone(next);
  }

  async appendConsent(input: {
    sessionId: string;
    category: ConsentCategory;
    status: Exclude<ConsentStatus, "not_requested">;
    actionId: string;
    occurredAt: string;
  }): Promise<void> {
    if (!this.#sessions.has(input.sessionId)) {
      throw new StateConflictError("Session does not exist");
    }
    if (this.#consentActions.has(input.actionId)) {
      throw new StateConflictError("Consent action already exists");
    }
    this.#consentActions.add(input.actionId);
  }

  async claimIdempotency(input: {
    scope: string;
    key: string;
    correlationId: string;
    now?: Date;
  }): Promise<{ claimed: boolean; record: IdempotencyRecord }> {
    const compound = `${input.scope}:${input.key}`;
    const existing = this.#idempotency.get(compound);
    if (existing) {
      return { claimed: false, record: structuredClone(existing) };
    }
    const timestamp = (input.now ?? new Date()).toISOString();
    const record: IdempotencyRecord = {
      scope: input.scope,
      key: input.key,
      state: "claimed",
      correlationId: input.correlationId,
      receiptId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.#idempotency.set(compound, record);
    return { claimed: true, record: structuredClone(record) };
  }

  async completeIdempotency(input: {
    scope: string;
    key: string;
    state: Exclude<IdempotencyState, "claimed">;
    receiptId?: string;
    now?: Date;
  }): Promise<IdempotencyRecord> {
    const record = this.#idempotency.get(`${input.scope}:${input.key}`);
    if (!record) throw new StateConflictError("Idempotency claim does not exist");
    if (record.state !== "claimed") {
      throw new StateConflictError("Idempotency claim is already terminal");
    }
    if (input.state === "confirmed" && !input.receiptId) {
      throw new StateConflictError("Confirmed action requires a receipt");
    }
    record.state = input.state;
    record.receiptId = input.receiptId ?? null;
    record.updatedAt = (input.now ?? new Date()).toISOString();
    return structuredClone(record);
  }
}
