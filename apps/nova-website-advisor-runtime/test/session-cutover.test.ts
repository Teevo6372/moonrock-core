import { describe, expect, it } from "vitest";
import { InMemoryDurableStateRepository } from "../src/durable-state.js";
import { decideSessionCutover, runDurableStateConformance } from "../src/session-cutover.js";
import type { Session } from "../src/domain.js";

const session: Session = {
  id: "session-sprint-009",
  correlationId: "correlation-sprint-009",
  state: "DISCLOSED",
  disclosureVersion: "nova-disclosure-1.0.0",
  disclosurePresented: true,
  sequence: 0,
  primaryIntent: null,
  secondaryIntents: [],
  discoveryQuestionCount: 0,
  consent: {
    save_contact: "not_requested",
    save_transcript: "not_requested",
    email_service: "not_requested",
    sms_service: "not_requested",
    phone_service: "not_requested",
    appointment_notifications: "not_requested",
    email_marketing: "not_requested",
    sms_marketing: "not_requested",
  },
  pendingAction: null,
  createdAt: "2026-07-31T03:30:00.000Z",
  expiresAt: "2026-07-31T04:00:00.000Z",
};

describe("session cutover", () => {
  it("keeps memory mode disabled by default", () => {
    expect(decideSessionCutover({})).toEqual({
      mode: "memory",
      enabled: false,
      reasonCode: "MEMORY_MODE",
    });
  });

  it("fails closed when postgres prerequisites are incomplete", () => {
    expect(() => decideSessionCutover({
      NOVA_SESSION_PERSISTENCE: "postgres",
      DATABASE_URL: "postgres://private-reference",
      NOVA_DURABLE_SESSION_CUTOVER: "true",
    })).toThrow(/conformance gate/);
  });

  it("authorizes only an explicit, conformance-passed postgres cutover", () => {
    expect(decideSessionCutover({
      NOVA_SESSION_PERSISTENCE: "postgres",
      DATABASE_URL: "postgres://private-reference",
      NOVA_DURABLE_STATE_CONFORMANCE: "passed",
      NOVA_DURABLE_SESSION_CUTOVER: "true",
    })).toEqual({
      mode: "postgres",
      enabled: true,
      reasonCode: "CUTOVER_AUTHORIZED",
    });
  });

  it("proves the portable repository contract before cutover", async () => {
    const result = await runDurableStateConformance(
      new InMemoryDurableStateRepository(),
      session,
    );
    expect(result.passed).toBe(true);
    expect(result.checks).toEqual([
      "create-load-roundtrip",
      "optimistic-versioning",
      "stale-write-rejection",
      "idempotent-replay",
    ]);
  });
});
