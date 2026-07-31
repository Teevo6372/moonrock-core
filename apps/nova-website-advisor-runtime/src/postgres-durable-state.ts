import type { Pool, PoolClient, QueryResultRow } from "pg";
import { consentCategories, type ConsentCategory, type ConsentStatus, type Session } from "./domain.js";
import {
  type DurableStateRepository,
  type IdempotencyRecord,
  type IdempotencyState,
  type SessionVersion,
  StateConflictError,
} from "./durable-state.js";

interface SessionRow extends QueryResultRow {
  session_id: string;
  correlation_id: string;
  lifecycle_state: Session["state"];
  state_version: string | number;
  message_sequence: number;
  disclosure_version: string;
  disclosure_presented: boolean;
  primary_intent: Session["primaryIntent"];
  secondary_intents: Session["secondaryIntents"];
  discovery_question_count: number;
  pending_action: Session["pendingAction"];
  created_at: Date | string;
  expires_at: Date | string;
}

interface ConsentRow extends QueryResultRow {
  category: ConsentCategory;
  status: Exclude<ConsentStatus, "not_requested">;
}

interface IdempotencyRow extends QueryResultRow {
  scope: string;
  idempotency_key: string;
  state: IdempotencyState;
  correlation_id: string;
  receipt_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export class PostgresDurableStateRepository implements DurableStateRepository {
  constructor(private readonly pool: Pool) {}

  async verifyConnection(): Promise<void> {
    await this.pool.query("SELECT 1");
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async createSession(session: Session): Promise<SessionVersion> {
    try {
      const result = await this.pool.query<SessionRow>(
        `INSERT INTO nova_sessions (
          session_id, correlation_id, lifecycle_state, state_version,
          message_sequence, disclosure_version, disclosure_presented,
          primary_intent, secondary_intents, discovery_question_count,
          pending_action, created_at, expires_at, updated_at
        ) VALUES (
          $1, $2, $3, 1, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $11
        )
        RETURNING *`,
        sessionParameters(session),
      );
      return await this.hydrate(requireRow(result.rows[0]), []);
    } catch (error) {
      throw mapPostgresConflict(error, "Session already exists");
    }
  }

  async loadSession(id: string): Promise<SessionVersion | null> {
    return withTransaction(this.pool, async (client) => {
      const session = await client.query<SessionRow>(
        "SELECT * FROM nova_sessions WHERE session_id = $1",
        [id],
      );
      const row = session.rows[0];
      if (!row) return null;
      const consent = await latestConsent(client, id);
      return this.hydrate(row, consent);
    });
  }

  async saveSession(
    session: Session,
    expectedVersion: number,
  ): Promise<SessionVersion> {
    return withTransaction(this.pool, async (client) => {
      const result = await client.query<SessionRow>(
        `UPDATE nova_sessions SET
          lifecycle_state = $2,
          message_sequence = $3,
          disclosure_version = $4,
          disclosure_presented = $5,
          primary_intent = $6,
          secondary_intents = $7::jsonb,
          discovery_question_count = $8,
          pending_action = $9,
          expires_at = $10,
          updated_at = $11,
          state_version = state_version + 1
        WHERE session_id = $1
          AND state_version = $12
          AND message_sequence <= $3
        RETURNING *`,
        [
          session.id,
          session.state,
          session.sequence,
          session.disclosureVersion,
          session.disclosurePresented,
          session.primaryIntent,
          JSON.stringify(session.secondaryIntents),
          session.discoveryQuestionCount,
          session.pendingAction,
          session.expiresAt,
          new Date().toISOString(),
          expectedVersion,
        ],
      );
      const row = result.rows[0];
      if (!row) {
        const current = await client.query<Pick<SessionRow, "state_version" | "message_sequence">>(
          "SELECT state_version, message_sequence FROM nova_sessions WHERE session_id = $1",
          [session.id],
        );
        const existing = current.rows[0];
        if (!existing) throw new StateConflictError("Session does not exist");
        if (Number(existing.state_version) !== expectedVersion) {
          throw new StateConflictError("Session version conflict");
        }
        throw new StateConflictError("Session sequence cannot move backward");
      }
      return this.hydrate(row, await latestConsent(client, session.id));
    });
  }

  async appendConsent(input: {
    sessionId: string;
    category: ConsentCategory;
    status: Exclude<ConsentStatus, "not_requested">;
    actionId: string;
    occurredAt: string;
  }): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO nova_consent_evidence (
          action_id, session_id, category, status, disclosure_version,
          affirmative_control_id, occurred_at
        )
        SELECT $1, session_id, $2, $3, disclosure_version, $1, $4::timestamptz
        FROM nova_sessions
        WHERE session_id = $5`,
        [
          input.actionId,
          input.category,
          input.status,
          input.occurredAt,
          input.sessionId,
        ],
      ).then((result) => {
        if (result.rowCount !== 1) {
          throw new StateConflictError("Session does not exist");
        }
      });
    } catch (error) {
      if (error instanceof StateConflictError) throw error;
      throw mapPostgresConflict(error, "Consent action already exists");
    }
  }

  async claimIdempotency(input: {
    scope: string;
    key: string;
    correlationId: string;
    now?: Date;
  }): Promise<{ claimed: boolean; record: IdempotencyRecord }> {
    const timestamp = (input.now ?? new Date()).toISOString();
    return withTransaction(this.pool, async (client) => {
      const inserted = await client.query<IdempotencyRow>(
        `INSERT INTO nova_idempotency (
          scope, idempotency_key, correlation_id, state, receipt_id,
          created_at, updated_at
        ) VALUES ($1, $2, $3, 'claimed', NULL, $4::timestamptz, $4::timestamptz)
        ON CONFLICT (scope, idempotency_key) DO NOTHING
        RETURNING *`,
        [input.scope, input.key, input.correlationId, timestamp],
      );
      const created = inserted.rows[0];
      if (
        created
        && created.correlation_id === input.correlationId
        && iso(created.created_at) === timestamp
      ) {
        return { claimed: true, record: idempotencyRecord(created) };
      }
      const existing = await client.query<IdempotencyRow>(
        `SELECT * FROM nova_idempotency
         WHERE scope = $1 AND idempotency_key = $2`,
        [input.scope, input.key],
      );
      return {
        claimed: false,
        record: idempotencyRecord(requireRow(existing.rows[0])),
      };
    });
  }

  async completeIdempotency(input: {
    scope: string;
    key: string;
    state: Exclude<IdempotencyState, "claimed">;
    receiptId?: string;
    now?: Date;
  }): Promise<IdempotencyRecord> {
    if (input.state === "confirmed" && !input.receiptId) {
      throw new StateConflictError("Confirmed action requires a receipt");
    }
    const result = await this.pool.query<IdempotencyRow>(
      `UPDATE nova_idempotency
       SET state = $3, receipt_id = $4, updated_at = $5::timestamptz
       WHERE scope = $1 AND idempotency_key = $2 AND state = 'claimed'
       RETURNING *`,
      [
        input.scope,
        input.key,
        input.state,
        input.receiptId ?? null,
        (input.now ?? new Date()).toISOString(),
      ],
    );
    const row = result.rows[0];
    if (row) return idempotencyRecord(row);
    const existing = await this.pool.query<IdempotencyRow>(
      `SELECT * FROM nova_idempotency
       WHERE scope = $1 AND idempotency_key = $2`,
      [input.scope, input.key],
    );
    if (!existing.rows[0]) {
      throw new StateConflictError("Idempotency claim does not exist");
    }
    throw new StateConflictError("Idempotency claim is already terminal");
  }

  private async hydrate(
    row: SessionRow,
    consentRows: ConsentRow[],
  ): Promise<SessionVersion> {
    const consent = Object.fromEntries(
      consentCategories.map((category) => [category, "not_requested"]),
    ) as Record<ConsentCategory, ConsentStatus>;
    for (const item of consentRows) consent[item.category] = item.status;
    return {
      version: Number(row.state_version),
      session: {
        id: row.session_id,
        correlationId: row.correlation_id,
        state: row.lifecycle_state,
        disclosureVersion: row.disclosure_version,
        disclosurePresented: row.disclosure_presented,
        sequence: row.message_sequence,
        primaryIntent: row.primary_intent,
        secondaryIntents: row.secondary_intents,
        discoveryQuestionCount: row.discovery_question_count,
        consent,
        pendingAction: row.pending_action,
        createdAt: iso(row.created_at),
        expiresAt: iso(row.expires_at),
      },
    };
  }
}

function sessionParameters(session: Session): unknown[] {
  return [
    session.id,
    session.correlationId,
    session.state,
    session.sequence,
    session.disclosureVersion,
    session.disclosurePresented,
    session.primaryIntent,
    JSON.stringify(session.secondaryIntents),
    session.discoveryQuestionCount,
    session.pendingAction,
    session.createdAt,
    session.expiresAt,
  ];
}

async function latestConsent(
  client: PoolClient,
  sessionId: string,
): Promise<ConsentRow[]> {
  const result = await client.query<ConsentRow>(
    `SELECT DISTINCT ON (category) category, status
     FROM nova_consent_evidence
     WHERE session_id = $1
     ORDER BY category, occurred_at DESC, consent_evidence_id DESC`,
    [sessionId],
  );
  return result.rows;
}

async function withTransaction<T>(
  pool: Pool,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const value = await operation(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function idempotencyRecord(row: IdempotencyRow): IdempotencyRecord {
  return {
    scope: row.scope,
    key: row.idempotency_key,
    state: row.state,
    correlationId: row.correlation_id,
    receiptId: row.receipt_id,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function requireRow<T>(row: T | undefined): T {
  if (!row) throw new Error("PostgreSQL did not return the expected row");
  return row;
}

function mapPostgresConflict(error: unknown, message: string): Error {
  if (
    typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code?: string }).code === "23505"
  ) {
    return new StateConflictError(message);
  }
  return error instanceof Error ? error : new Error("PostgreSQL operation failed");
}
