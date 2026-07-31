import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Pool, PoolClient } from "pg";

export interface AppliedMigration {
  version: string;
  checksum: string;
}

export class MigrationChecksumError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MigrationChecksumError";
  }
}

export async function runMigrations(
  pool: Pool,
  migrationsDirectory: string,
): Promise<AppliedMigration[]> {
  const files = readdirSync(migrationsDirectory)
    .filter((file) => /^\d+_[a-z0-9_]+\.sql$/i.test(file))
    .sort();
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS nova_schema_migrations (
        version TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query("SELECT pg_advisory_lock(hashtext('nova_schema_migrations'))");
    const applied: AppliedMigration[] = [];
    for (const file of files) {
      const version = file.replace(/\.sql$/i, "");
      const source = readFileSync(resolve(migrationsDirectory, file), "utf8");
      const checksum = createHash("sha256").update(source).digest("hex");
      const existing = await client.query<{ checksum: string }>(
        "SELECT checksum FROM nova_schema_migrations WHERE version = $1",
        [version],
      );
      if (existing.rows[0]) {
        if (existing.rows[0].checksum !== checksum) {
          throw new MigrationChecksumError(
            `Migration ${version} checksum does not match the applied version`,
          );
        }
        continue;
      }
      await applyMigration(client, version, checksum, source);
      applied.push({ version, checksum });
    }
    return applied;
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext('nova_schema_migrations'))")
      .catch(() => undefined);
    client.release();
  }
}

async function applyMigration(
  client: PoolClient,
  version: string,
  checksum: string,
  source: string,
): Promise<void> {
  await client.query("BEGIN");
  try {
    await client.query(stripTransactionBoundary(source));
    await client.query(
      `INSERT INTO nova_schema_migrations (version, checksum)
       VALUES ($1, $2)`,
      [version, checksum],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

function stripTransactionBoundary(source: string): string {
  return source
    .replace(/^\s*BEGIN;\s*/i, "")
    .replace(/\s*COMMIT;\s*$/i, "")
    .trim();
}
