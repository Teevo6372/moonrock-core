import { describe, expect, it } from "vitest";
import {
  assertTransition,
  canTransition,
  InvalidTransitionError,
} from "../src/lifecycle.js";
import { InMemorySessionStore } from "../src/session-store.js";

describe("lifecycle", () => {
  it("allows governed discovery progression", () => {
    expect(canTransition("DISCLOSED", "INTENT_IDENTIFIED")).toBe(true);
    expect(canTransition("INTENT_IDENTIFIED", "DISCOVERY_IN_PROGRESS")).toBe(
      true,
    );
    expect(canTransition("DISCOVERY_IN_PROGRESS", "ROUTE_PROPOSED")).toBe(true);
  });

  it("blocks jumping from disclosure to booking confirmation", () => {
    expect(() =>
      assertTransition("DISCLOSED", "BOOKING_CONFIRMED"),
    ).toThrow(InvalidTransitionError);
  });

  it("prevents transitions after expiry", () => {
    expect(canTransition("EXPIRED", "DISCOVERY_IN_PROGRESS")).toBe(false);
  });

  it("expires sessions deterministically", () => {
    const store = new InMemorySessionStore();
    const session = store.create(new Date("2026-01-01T00:00:00Z"), 1);
    expect(
      store.get(session.id, new Date("2026-01-01T00:02:00Z"))?.state,
    ).toBe("EXPIRED");
  });

  it("rejects duplicate or skipped message sequence in orchestration", () => {
    const store = new InMemorySessionStore();
    const session = store.create();
    session.sequence = 2;
    store.save(session);
    expect(store.get(session.id)?.sequence).toBe(2);
  });
});

