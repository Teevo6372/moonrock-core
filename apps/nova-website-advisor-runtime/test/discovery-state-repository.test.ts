import { describe, expect, it } from "vitest";
import { InMemoryDiscoveryStateRepository } from "../src/discovery-state-repository.js";
import { createDiscoverySession } from "../src/discovery-session.js";

describe("discovery state repository", () => {
  it("creates, loads, and versions discovery state", async () => {
    const repo = new InMemoryDiscoveryStateRepository();
    const initial = createDiscoverySession("startup");
    const created = await repo.create("session-1", initial);
    expect(created.version).toBe(1);
    const loaded = await repo.load("session-1");
    expect(loaded?.state.path).toBe("startup");
    const updated = await repo.save("session-1", { ...initial, completed: true }, 1);
    expect(updated.version).toBe(2);
    expect(updated.state.completed).toBe(true);
  });
});
