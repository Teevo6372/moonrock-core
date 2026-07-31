import { describe, expect, it } from "vitest";
import { DurableSessionCoordinator } from "../src/durable-session-coordinator.js";
import { InMemoryDurableStateRepository } from "../src/durable-state.js";
import { SessionPersistenceController } from "../src/session-persistence-controller.js";
import { InMemorySessionStore } from "../src/session-store.js";

function setup(repository = new InMemoryDurableStateRepository()) {
  const sessions = new InMemorySessionStore();
  const persistence = new SessionPersistenceController(
    "durable-staging",
    sessions,
    new DurableSessionCoordinator(repository, sessions),
  );
  return { repository, sessions, persistence };
}

describe("Sprint 012 controlled transaction boundary", () => {
  it("does not complete create until the durable record exists", async () => {
    const { repository, sessions, persistence } = setup();
    const result = await persistence.transactCreate(() => {
      const session = sessions.create(new Date("2026-07-31T04:00:00.000Z"));
      return { session, result: session.id };
    });

    const stored = await repository.loadSession(result);
    expect(stored?.version).toBe(1);
    expect(persistence.metrics.transactionSuccessCount).toBe(1);
  });

  it("recovers after restart and commits the resumed mutation exactly once", async () => {
    const repository = new InMemoryDurableStateRepository();
    const first = setup(repository);
    const session = first.sessions.create(new Date("2026-07-31T04:00:00.000Z"));
    await first.persistence.recordCreated(session);

    const restarted = setup(repository);
    await restarted.persistence.transact(session.id, () => {
      const recovered = restarted.sessions.get(session.id);
      if (!recovered) throw new Error("recovery failed");
      recovered.sequence = 1;
      restarted.sessions.save(recovered);
    });

    const stored = await repository.loadSession(session.id);
    expect(stored?.version).toBe(2);
    expect(stored?.session.sequence).toBe(1);
    expect(restarted.persistence.metrics.recoverySuccessCount).toBe(1);
    expect(restarted.persistence.metrics.transactionSuccessCount).toBe(1);
  });

  it("fails closed and records evidence when persistence rejects", async () => {
    const repository = new InMemoryDurableStateRepository();
    const first = setup(repository);
    const session = first.sessions.create();
    await first.persistence.recordCreated(session);

    const stale = setup(repository);
    await stale.persistence.ensureLoaded(session.id);

    await first.persistence.transact(session.id, () => {
      const current = first.sessions.get(session.id)!;
      current.sequence = 1;
      first.sessions.save(current);
    });

    await expect(stale.persistence.transact(session.id, () => {
      const current = stale.sessions.get(session.id)!;
      current.sequence = 2;
      stale.sessions.save(current);
    })).rejects.toThrow();

    expect(stale.persistence.metrics.transactionFailureCount).toBe(1);
    expect(stale.persistence.metrics.optimisticConflictCount).toBe(1);
    expect(stale.persistence.evidence.at(-1)?.operation).toBe("transaction_failed");
  });

  it("supports explicit rollback to the memory-only path", async () => {
    const { repository, sessions, persistence } = setup();
    const session = sessions.create();
    await persistence.recordCreated(session);
    persistence.rollbackToMemory();

    await persistence.transact(session.id, () => {
      const current = sessions.get(session.id)!;
      current.sequence = 3;
      sessions.save(current);
    });

    const stored = await repository.loadSession(session.id);
    expect(stored?.version).toBe(1);
    expect(persistence.currentMode).toBe("memory");
    expect(persistence.metrics.rollbackCount).toBe(1);
  });
});
