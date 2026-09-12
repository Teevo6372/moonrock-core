import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { hashPassword } from "./auth.js";
import { PostgresAccountRepository } from "./postgres-account-repository.js";

// Usage: DATABASE_URL=... node dist/src/seed-admin-cli.js you@example.com "a strong password"
async function main(): Promise<void> {
  const email = process.argv[2];
  const password = process.argv[3];
  if (!email || !password) {
    throw new Error('Usage: seed-admin-cli.js <email> "<password>"');
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set to seed an account against the real database.");
  }

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  try {
    const accounts = new PostgresAccountRepository(pool);
    const existing = await accounts.findByEmail(email);
    if (existing) {
      throw new Error(`An account for ${email} already exists (role: ${existing.role}).`);
    }
    const passwordHash = await hashPassword(password);
    const account = await accounts.create({
      accountId: randomUUID(),
      email,
      passwordHash,
      role: "admin",
      displayName: "Moonrock Admin",
    });
    process.stdout.write(`Created admin account ${account.email} (${account.accountId})\n`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown admin-seed failure";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
