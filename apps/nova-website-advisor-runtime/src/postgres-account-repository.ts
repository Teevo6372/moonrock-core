import type { Pool, QueryResultRow } from "pg";

export interface Account {
  accountId: string;
  email: string;
  passwordHash: string;
  role: "admin" | "client";
  clientGhlLocationId: string | null;
  displayName: string | null;
}

interface AccountRow extends QueryResultRow {
  account_id: string;
  email: string;
  password_hash: string;
  role: "admin" | "client";
  client_ghl_location_id: string | null;
  display_name: string | null;
}

export class PostgresAccountRepository {
  constructor(private readonly pool: Pool) {}

  async findByEmail(email: string): Promise<Account | null> {
    const result = await this.pool.query<AccountRow>(
      "SELECT * FROM nova_accounts WHERE email = $1",
      [email.toLowerCase()],
    );
    const row = result.rows[0];
    return row ? hydrate(row) : null;
  }

  async findById(accountId: string): Promise<Account | null> {
    const result = await this.pool.query<AccountRow>(
      "SELECT * FROM nova_accounts WHERE account_id = $1",
      [accountId],
    );
    const row = result.rows[0];
    return row ? hydrate(row) : null;
  }

  /** Every account a given client contact can see - currently just one row, but callers should not assume that. */
  async findByClientLocation(clientGhlLocationId: string): Promise<Account[]> {
    const result = await this.pool.query<AccountRow>(
      "SELECT * FROM nova_accounts WHERE client_ghl_location_id = $1",
      [clientGhlLocationId],
    );
    return result.rows.map(hydrate);
  }

  async create(input: {
    accountId: string;
    email: string;
    passwordHash: string;
    role: "admin" | "client";
    clientGhlLocationId?: string;
    displayName?: string;
  }): Promise<Account> {
    try {
      const result = await this.pool.query<AccountRow>(
        `INSERT INTO nova_accounts (
          account_id, email, password_hash, role, client_ghl_location_id, display_name, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *`,
        [
          input.accountId,
          input.email.toLowerCase(),
          input.passwordHash,
          input.role,
          input.clientGhlLocationId ?? null,
          input.displayName ?? null,
        ],
      );
      return hydrate(requireRow(result.rows[0]));
    } catch (error) {
      throw mapPostgresConflict(error, "An account with that email already exists");
    }
  }
}

function hydrate(row: AccountRow): Account {
  return {
    accountId: row.account_id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    clientGhlLocationId: row.client_ghl_location_id,
    displayName: row.display_name,
  };
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
    return new Error(message);
  }
  return error instanceof Error ? error : new Error("PostgreSQL operation failed");
}
