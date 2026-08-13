import type { Pool, QueryResultRow } from "pg";
import type { DiscoverySessionState } from "./discovery-session.js";
import type { DiscoveryStateRepository, DiscoveryStateVersion } from "./discovery-state-repository.js";

interface Row extends QueryResultRow {
  session_id: string;
  state: DiscoverySessionState;
  state_version: string | number;
}

export class PostgresDiscoveryStateRepository implements DiscoveryStateRepository {
  constructor(private readonly pool: Pool) {}

  async create(sessionId: string, state: DiscoverySessionState): Promise<DiscoveryStateVersion> {
    const result = await this.pool.query<Row>(
      "INSERT INTO nova_discovery_state (session_id, state, state_version, created_at, updated_at) VALUES ($1, $2::jsonb, 1, NOW(), NOW()) RETURNING session_id, state, state_version",
      [sessionId, JSON.stringify(state)],
    );
    if (!result.rows[0]) throw new Error("Discovery create failed");
    return hydrate(result.rows[0]);
  }

  async load(sessionId: string): Promise<DiscoveryStateVersion | null> {
    const result = await this.pool.query<Row>(
      "SELECT session_id, state, state_version FROM nova_discovery_state WHERE session_id = $1",
      [sessionId],
    );
    return result.rows[0] ? hydrate(result.rows[0]) : null;
  }

  async save(sessionId: string, state: DiscoverySessionState, expectedVersion: number): Promise<DiscoveryStateVersion> {
    const result = await this.pool.query<Row>(
      "UPDATE nova_discovery_state SET state = $2::jsonb, state_version = state_version + 1, updated_at = NOW() WHERE session_id = $1 AND state_version = $3 RETURNING session_id, state, state_version",
      [sessionId, JSON.stringify(state), expectedVersion],
    );
    if (!result.rows[0]) throw new Error("Discovery version conflict");
    return hydrate(result.rows[0]);
  }
}

function hydrate(row: Row): DiscoveryStateVersion {
  return { sessionId: row.session_id, state: row.state, version: Number(row.state_version) };
}
