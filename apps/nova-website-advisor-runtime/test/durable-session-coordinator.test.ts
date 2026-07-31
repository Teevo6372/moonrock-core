import { describe, expect, it } from "vitest";
import { DurableSessionCoordinator } from "../src/durable-session-coordinator.js";
import { InMemoryDurableStateRepository } from "../src/durable-state.js";
import { InMemorySessionStore } from "../src/session-store.js";

function setup() {
  const repository = new InMemoryDurableStateRepository();
  const cache = new InMemorySessionStore();
  const coordinator = new DurableSessionCoordinator(repository, cache);
  return { repository, cache, coordinator };
}

describe("Sprint 010 durable session coordinator", () => {
  it("records a newly created session and advances its durable version", async () => {
    const { cache, coordinator } = setup();
    const session = cache.create(new Date("2026-07-31T03:00:00.000Z"));
    const created = await coordinator.recordCreated(session);
    expect(created.version).toBe(1);
    session.sequence = 1;
    cache.save(session);
    const saved = await coordinator.commit(session);
    expect(saved.version).toBe(2);
  });

  it("recovers a session into an empty runtime cache after restart", async () => {
    const repository = new InMemoryDurableStateRepository();
    const firstCache = new InMemorySessionStore();
    const first = new DurableSessionCoordinator(repository, firstCache);
    const session = firstCache.create(new Date("2026-07-31T03:00:00.000Z"));
    await first.recordCreated(session);

    const restartedCache = new InMemorySessionStore();
    const restarted = new DurableSessionCoordinator(repository, restartedCache);
    const recovered = await restarted.ensureLoaded(session.id);
    expect(recovered?.id).toBe(session.id);
    expect(restartedCache.get(session.id)?.correlationId).toBe(session.correlationId);
  });

  it("fails closed when commit is attempted without recovery evidence", async () => {
    const { cache, coordinator } = setup();
    const session = cache.create();
    await expect(coordinator.commit(session)).rejects.toThrow(
      "Durable session version is unavailable",
    );
  });
});
