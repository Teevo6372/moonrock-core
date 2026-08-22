import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { Pool } from "pg";
import { DataType, newDb } from "pg-mem";
import { describe, expect, it } from "vitest";
import {
  InMemorySessionStore,
  MigrationChecksumError,
  PostgresDurableStateRepository,
  runMigrations,
  StateConflictError,
} from "../src/index.js";

const migrationsDirectory = resolve(
  import.meta.dirname,
  "../migrations",
);

async function testPool(): Promise<Pool> {
  const database = newDb({ noAstCoverageCheck: true });
  database.public.registerFunction({
    name: "hashtext",
    args: [DataType.text],
    returns: DataType.integer,
    implementation: () => 6372,
  });
  for (const name of ["pg_advisory_lock", "pg_advisory_unlock"]) {
    database.public.registerFunction({
      name,
      args: [DataType.integer],
      returns: DataType.bool,
      implementation: () => true,
    });
  }
  const adapter = database.adapters.createPg();
  const pool = new adapter.Pool() as unknown as Pool;
  await runMigrations(pool, migrationsDirectory);
  return pool;
}

describe("PostgreSQL durable repository", () => {
  it("round-trips the complete session and enforces optimistic versions", async () => {
    const pool = await testPool();
    const repository = new PostgresDurableStateRepository(pool);
    const session = new InMemorySessionStore().create(
      new Date("2026-07-31T12:00:00.000Z"),
    );
    const created = await repository.createSession(session);
    expect(created).toEqual({ session, version: 1 });

    await repository.appendConsent({
      sessionId: session.id,
      category: "save_contact",
      status: "granted",
      actionId: "consent-action-1",
      occurredAt: "2026-07-31T12:01:00.000Z",
    });
    const changed = {
      ...session,
      sequence: 1,
      discoveryQuestionCount: 1,
      primaryIntent: "GROWTH" as const,
    };
    const saved = await repository.saveSession(changed, created.version);
    expect(saved.version).toBe(2);
    expect(saved.session).toMatchObject({
      sequence: 1,
      discoveryQuestionCount: 1,
      primaryIntent: "GROWTH",
      consent: { save_contact: "granted" },
    });
    await expect(repository.saveSession(
      { ...changed, sequence: 2 },
      created.version,
    )).rejects.toThrow(StateConflictError);
    await repository.close();
  });

  it("keeps consent append-only and idempotency terminal", async () => {
    const pool = await testPool();
    const repository = new PostgresDurableStateRepository(pool);
    const session = new InMemorySessionStore().create();
    await repository.createSession(session);
    const consent = {
      sessionId: session.id,
      category: "save_contact" as const,
      status: "granted" as const,
      actionId: "consent-action-2",
      occurredAt: "2026-07-31T12:01:00.000Z",
    };
    await repository.appendConsent(consent);
    await expect(repository.appendConsent(consent)).rejects.toThrow(
      /already exists/,
    );

    const first = await repository.claimIdempotency({
      scope: "handoff",
      key: "request-1",
      correlationId: session.correlationId,
      now: new Date("2026-07-31T12:02:00.000Z"),
    });
    const second = await repository.claimIdempotency({
      scope: "handoff",
      key: "request-1",
      correlationId: "different-correlation",
    });
    expect(first.claimed).toBe(true);
    expect(second).toEqual({ claimed: false, record: first.record });
    await repository.completeIdempotency({
      scope: "handoff",
      key: "request-1",
      state: "confirmed",
      receiptId: "receipt-1",
      now: new Date("2026-07-31T12:03:00.000Z"),
    });
    await expect(repository.completeIdempotency({
      scope: "handoff",
      key: "request-1",
      state: "outcome_unknown",
    })).rejects.toThrow(/already terminal/);
    await repository.close();
  });
});

describe("migration runner", () => {
  it("records every ordered migration checksum and is safe to rerun", async () => {
    const pool = await testPool();
    const first = await pool.query<{
      version: string;
      checksum: string;
    }>(
      "SELECT version, checksum FROM nova_schema_migrations ORDER BY version",
    );
    const expectedVersions = readdirSync(migrationsDirectory)
      .filter((name) => name.endsWith(".sql"))
      .map((name) => name.slice(0, -4))
      .sort();
    expect(first.rows.map((row) => row.version)).toEqual(expectedVersions);
    expect(first.rows.every((row) => /^[a-f0-9]{64}$/.test(row.checksum))).toBe(
      true,
    );
    expect(await runMigrations(pool, migrationsDirectory)).toEqual([]);
    await pool.end();
  });

  it("fails closed when an applied checksum is changed", async () => {
    const pool = await testPool();
    await pool.query(
      `UPDATE nova_schema_migrations
       SET checksum = $1
       WHERE version = '0001_staging_foundation'`,
      ["0".repeat(64)],
    );
    await expect(runMigrations(pool, migrationsDirectory)).rejects.toThrow(
      MigrationChecksumError,
    );
    await pool.end();
  });

  it("packages every migration into the runtime image", () => {
    const dockerfile = readFileSync(
      new URL("../Dockerfile", import.meta.url),
      "utf8",
    );
    expect(dockerfile).toContain(
      "COPY --from=build /workspace/apps/nova-website-advisor-runtime/migrations ./migrations",
    );
  });
});