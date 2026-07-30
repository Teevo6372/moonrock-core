import { describe, expect, it } from "vitest";
import { KillSwitch } from "../src/kill-switch.js";
import { PolicyEngine } from "../src/policy.js";
import { InMemorySessionStore } from "../src/session-store.js";

const healthy = {
  model: "healthy",
  ghlReads: "healthy",
  ghlWrites: "healthy",
} as const;

describe("policy engine", () => {
  it("requires save-contact consent before contact creation", () => {
    const session = new InMemorySessionStore().create();
    session.state = "CONSENT_REQUESTED";
    const result = new PolicyEngine().evaluateTool({
      session,
      tool: "create_contact",
      riskSignals: [],
      health: healthy,
      killSwitchEnabled: false,
    });
    expect(result.decision).toBe("require_consent");
  });

  it("does not treat marketing consent as service consent", () => {
    const session = new InMemorySessionStore().create();
    session.state = "CONSENT_REQUESTED";
    session.consent.email_marketing = "granted";
    const result = new PolicyEngine().evaluateTool({
      session,
      tool: "create_contact",
      riskSignals: [],
      health: healthy,
      killSwitchEnabled: false,
    });
    expect(result.decision).toBe("require_consent");
  });

  it("allows an approved contact write with consent and state", () => {
    const session = new InMemorySessionStore().create();
    session.state = "CONSENT_REQUESTED";
    session.consent.save_contact = "granted";
    const result = new PolicyEngine().evaluateTool({
      session,
      tool: "create_contact",
      riskSignals: [],
      health: healthy,
      killSwitchEnabled: false,
    });
    expect(result.decision).toBe("allow");
  });

  it("routes protected risk to a human", () => {
    const session = new InMemorySessionStore().create();
    session.state = "CONSENT_REQUESTED";
    session.consent.save_contact = "granted";
    const result = new PolicyEngine().evaluateTool({
      session,
      tool: "create_contact",
      riskSignals: ["legal"],
      health: healthy,
      killSwitchEnabled: false,
    });
    expect(result).toEqual({
      decision: "require_human",
      reasonCode: "PROTECTED_RISK",
    });
  });

  it("degrades all tools when the kill switch is enabled", () => {
    const killSwitch = new KillSwitch();
    killSwitch.enable();
    const session = new InMemorySessionStore().create();
    const result = new PolicyEngine().evaluateTool({
      session,
      tool: "list_approved_slots",
      riskSignals: [],
      health: healthy,
      killSwitchEnabled: killSwitch.enabled,
    });
    expect(result).toEqual({
      decision: "degrade",
      reasonCode: "KILL_SWITCH_ENABLED",
    });
  });

  it("degrades writes when GHL writes are unavailable", () => {
    const session = new InMemorySessionStore().create();
    session.state = "CONSENT_REQUESTED";
    session.consent.save_contact = "granted";
    const result = new PolicyEngine().evaluateTool({
      session,
      tool: "create_contact",
      riskSignals: [],
      health: { ...healthy, ghlWrites: "unavailable" },
      killSwitchEnabled: false,
    });
    expect(result.decision).toBe("degrade");
  });
});

