import type { DiscoverySessionState } from "./discovery-session.js";

export interface DiscoveryStateVersion {
  sessionId: string;
  state: DiscoverySessionState;
  version: number;
}

export interface DiscoveryStateRepository {
  create(sessionId: string, state: DiscoverySessionState): Promise<DiscoveryStateVersion>;
  load(sessionId: string): Promise<DiscoveryStateVersion | null>;
  save(sessionId: string, state: DiscoverySessionState, expectedVersion: number): Promise<DiscoveryStateVersion>;
}

export class InMemoryDiscoveryStateRepository implements DiscoveryStateRepository {
  private readonly records = new Map<string, DiscoveryStateVersion>();

  async create(sessionId: string, state: DiscoverySessionState): Promise<DiscoveryStateVersion> {
    if (this.records.has(sessionId)) throw new Error("Discovery already exists");
    const record = { sessionId, state: structuredClone(state), version: 1 };
    this.records.set(sessionId, record);
    return structuredClone(record);
  }

  async load(sessionId: string): Promise<DiscoveryStateVersion | null> {
    const record = this.records.get(sessionId);
    return record ? structuredClone(record) : null;
  }

  async save(sessionId: string, state: DiscoverySessionState, expectedVersion: number): Promise<DiscoveryStateVersion> {
    const current = this.records.get(sessionId);
    if (!current) throw new Error("Discovery does not exist");
    if (current.version !== expectedVersion) throw new Error("Discovery version conflict");
    const next = { sessionId, state: structuredClone(state), version: current.version + 1 };
    this.records.set(sessionId, next);
    return structuredClone(next);
  }
}
