import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import type { Pool } from "pg";
import { DataType, newDb } from "pg-mem";
import { beforeEach, describe, expect, it } from "vitest";
import { createAuthRouter } from "../src/auth-router.js";
import { hashPassword, verifySessionToken } from "../src/auth.js";
import { runMigrations } from "../src/migrations.js";
import { PostgresAccountRepository } from "../src/postgres-account-repository.js";

const migrationsDirectory = resolve(import.meta.dirname, "../migrations");
const SESSION_SECRET = "test-session-secret";
const CURRENT_PASSWORD = "original-password-1";
const NEW_PASSWORD = "replacement-password-2";

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

function sessionCookie(response: Response): string {
  const header = response.headers.get("set-cookie") ?? "";
  return header.split(";")[0] ?? "";
}

describe("POST /password", () => {
  let accounts: PostgresAccountRepository;
  let router: ReturnType<typeof createAuthRouter>;
  let accountId: string;

  beforeEach(async () => {
    accounts = new PostgresAccountRepository(await testPool());
    accountId = randomUUID();
    await accounts.create({
      accountId,
      email: "admin@example.com",
      passwordHash: await hashPassword(CURRENT_PASSWORD),
      role: "admin",
      displayName: "Moonrock Admin",
    });
    router = createAuthRouter({ accountRepository: accounts, sessionSecret: SESSION_SECRET });
  });

  async function login(password = CURRENT_PASSWORD): Promise<Response> {
    return router.request("http://localhost/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@example.com", password }),
    });
  }

  async function changePassword(cookie: string, body: unknown): Promise<Response> {
    return router.request("http://localhost/password", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify(body),
    });
  }

  it("rotates the password and lets the new one log in", async () => {
    const cookie = sessionCookie(await login());
    const changed = await changePassword(cookie, {
      currentPassword: CURRENT_PASSWORD,
      newPassword: NEW_PASSWORD,
    });

    expect(changed.status).toBe(200);
    expect(await changed.json()).toEqual({ status: "password_updated" });
    expect((await login(NEW_PASSWORD)).status).toBe(200);
    expect((await login(CURRENT_PASSWORD)).status).toBe(401);
  });

  it("re-issues the caller's own session cookie so they stay signed in", async () => {
    const cookie = sessionCookie(await login());
    const changed = await changePassword(cookie, {
      currentPassword: CURRENT_PASSWORD,
      newPassword: NEW_PASSWORD,
    });

    const reissued = sessionCookie(changed).replace("nova_session=", "");
    const payload = verifySessionToken(decodeURIComponent(reissued), SESSION_SECRET);
    expect(payload?.accountId).toBe(accountId);
    expect(payload?.role).toBe("admin");
  });

  it("rejects a wrong current password without changing anything", async () => {
    const cookie = sessionCookie(await login());
    const changed = await changePassword(cookie, {
      currentPassword: "not-the-current-password",
      newPassword: NEW_PASSWORD,
    });

    expect(changed.status).toBe(401);
    expect((await login(CURRENT_PASSWORD)).status).toBe(200);
  });

  it("requires a session", async () => {
    const changed = await changePassword("", {
      currentPassword: CURRENT_PASSWORD,
      newPassword: NEW_PASSWORD,
    });
    expect(changed.status).toBe(401);
  });

  it("rejects a new password below the minimum length", async () => {
    const cookie = sessionCookie(await login());
    const changed = await changePassword(cookie, { currentPassword: CURRENT_PASSWORD, newPassword: "short" });
    expect(changed.status).toBe(400);
    expect((await changed.json() as { code: string }).code).toBe("PASSWORD_TOO_SHORT");
  });

  it("rejects reusing the current password", async () => {
    const cookie = sessionCookie(await login());
    const changed = await changePassword(cookie, {
      currentPassword: CURRENT_PASSWORD,
      newPassword: CURRENT_PASSWORD,
    });
    expect(changed.status).toBe(400);
    expect((await changed.json() as { code: string }).code).toBe("PASSWORD_UNCHANGED");
  });

  it("fails closed with no session secret configured", async () => {
    const unconfigured = createAuthRouter({ accountRepository: accounts });
    const response = await unconfigured.request("http://localhost/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currentPassword: CURRENT_PASSWORD, newPassword: NEW_PASSWORD }),
    });
    expect(response.status).toBe(503);
  });
});
