import { describe, expect, it } from "vitest";
import { DurableSessionCoordinator } from "../src/durable-session-coordinator.js";
import { InMemoryDurableStateRepository } from "../src/durable-state.js";
import { SessionPersistenceController } from "../src/session-persistence-controller.js";
import { InMemorySessionStore } from "../src/session-store.js";

function controller(
  repository: InMemoryDurableStateRepository,
  sessions = new InMemorySessionStore(),
) {
  return {
    sessions,
    persistence: new SessionPersistenceController(
      "durable-staging",
      sessions,
      new DurableSessionCoordinator(repository, sessions),
    ),
  };
}

describe("Sprint 011 session persistence controller", () => {
  it("persists, restarts, recovers, continues, and commits with evidence", async () => {
    const repository = new InMemoryDurableStateRepository();
    const first = controller(repository);
    const session = first.sessions.create(new Date("2026-07-31T04:00:00.000Z"));
    await first.persistence.recordCreated(session);

    const restarted = controller(repository);
    const recovered = await restarted.persistence.ensureLoaded(session.id);
    expect(recovered?.id).toBe(session.id);

    recovered!.sequence = 1;
    restarted.sessions.save(recovered!);
    await restarted.persistence.commit(session.id);

    expect(restarted.persistence.evidence.map((entry) => entry.operation)).toEqual([
      "recovered",
      "committed",
    ]);
    expect(restarted.persistence.evidence.at(-1)?.durableVersion).toBe(2);
  });

  it("detects optimistic concurrency conflicts across two runtimes", async () => {
    const repository = new InMemoryDurableStateRepository();
    const origin = controller(repository);
    const session = origin.sessions.create();
    await origin.persistence.recordCreated(session);

    const left = controller(repository);
    const right = controller(repository);
    const leftSession = await left.persistence.ensureLoaded(session.id);
    const rightSession = await right.persistence.ensureLoaded(session.id);

    leftSession!.sequence = 1;
    left.sessions.save(leftSession!);
    await left.persistence.commit(session.id);

    rightSession!.sequence = 2;
    right.sessions.save(rightSession!);
    await expect(right.persistence.commit(session.id)).rejects.toThrow(/version/i);
  });

  it("rolls back to memory mode without issuing new durable writes", async () => {
    const repository = new InMemoryDurableStateRepository();
    const runtime = controller(repository);
    const session = runtime.sessions.create();
    await runtime.persistence.recordCreated(session);

    runtime.persistence.rollbackToMemory();
    session.sequence = 1;
    runtime.sessions.save(session);
    await runtime.persistence.commit(session.id);

    const stored = await repository.loadSession(session.id);
    expect(runtime.persistence.currentMode).toBe("memory");
    expect(stored?.version).toBe(1);
    expect(runtime.persistence.evidence.at(-1)?.operation).toBe("rollback");
  });

  it("keeps memory mode as the no-write default", async () => {
    const repository = new InMemoryDurableStateRepository();
    const sessions = new InMemorySessionStore();
    const persistence = new SessionPersistenceController(
      "memory",
      sessions,
      new DurableSessionCoordinator(repository, sessions),
    );
    const session = sessions.create();
    await persistence.recordCreated(session);
    await persistence.commit(session.id);

    expect(await repository.loadSession(session.id)).toBeNull();
    expect(persistence.evidence).toEqual([]);
  });
});
