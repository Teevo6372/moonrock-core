import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BoundedEventStreamHub,
  ConfigurationLoadError,
  DependencyHealthRegistry,
  InMemoryDurableStateRepository,
  InMemorySessionStore,
  StateConflictError,
  loadStagingConfigFile,
  type PublicRuntimeEvent,
  type StagingRuntimeConfig,
} from "../src/index.js";

function stagingConfig(): StagingRuntimeConfig {
  return {
    environment: "staging",
    releaseId: "nova-web-r1-s002",
    publicOrigin: "https://nova-staging.moonrock.test",
    deploymentTargetId: "pending-managed-node-target",
    secretStoreId: "pending-host-secret-store",
    secretReferences: {
      modelCredential: "secretref://nova-staging/model",
      ghlCredential: "secretref://nova-staging/ghl",
      stateCredential: "secretref://nova-staging/state",
    },
    state: {
      backend: "durable",
      namespace: "nova-web-staging",
      retentionPolicyId: "retention-policy-pending-approval",
      transcriptStorage: "disabled",
    },
    providers: {
      model: "disconnected",
      ghl: "disconnected",
      externalWritesEnabled: false,
    },
    observability: {
      sinkId: "pending-redacted-event-sink",
      alertPolicyId: "pending-staging-alert-policy",
      rawMessageLogging: false,
    },
    gates: {
      deploymentTargetApproved: false,
      secretStoreApproved: false,
      durableStateDesignApproved: true,
      providerSandboxApproved: false,
      knowledgeBundleApproved: false,
      privacyReviewApproved: false,
      securityThreatModelApproved: false,
      accessibilityReviewApproved: false,
      incidentOwnerAssigned: false,
      rollbackArtifactVerified: false,
    },
  };
}

describe("durable repository contract", () => {
  it("enforces optimistic session versions", async () => {
    const repository = new InMemoryDurableStateRepository();
    const session = new InMemorySessionStore().create();
    const created = await repository.createSession(session);
    const changed = { ...session, sequence: 1 };
    await repository.saveSession(changed, created.version);
    await expect(repository.saveSession(
      { ...changed, sequence: 2 },
      created.version,
    )).rejects.toThrow(StateConflictError);
  });

  it("never permits message sequence rollback", async () => {
    const repository = new InMemoryDurableStateRepository();
    const session = new InMemorySessionStore().create();
    const created = await repository.createSession({ ...session, sequence: 2 });
    await expect(repository.saveSession(
      { ...session, sequence: 1 },
      created.version,
    )).rejects.toThrow(/cannot move backward/);
  });

  it("claims an idempotency key exactly once", async () => {
    const repository = new InMemoryDurableStateRepository();
    const first = await repository.claimIdempotency({
      scope: "booking",
      key: "session-1:slot-1",
      correlationId: "correlation-1",
    });
    const second = await repository.claimIdempotency({
      scope: "booking",
      key: "session-1:slot-1",
      correlationId: "correlation-2",
    });
    expect(first.claimed).toBe(true);
    expect(second.claimed).toBe(false);
    expect(second.record.correlationId).toBe("correlation-1");
  });

  it("requires an authoritative receipt before confirmation", async () => {
    const repository = new InMemoryDurableStateRepository();
    await repository.claimIdempotency({
      scope: "handoff",
      key: "action-1",
      correlationId: "correlation-1",
    });
    await expect(repository.completeIdempotency({
      scope: "handoff",
      key: "action-1",
      state: "confirmed",
    })).rejects.toThrow(/requires a receipt/);
  });

  it("does not reopen terminal unknown outcomes", async () => {
    const repository = new InMemoryDurableStateRepository();
    await repository.claimIdempotency({
      scope: "booking",
      key: "action-unknown",
      correlationId: "correlation-1",
    });
    await repository.completeIdempotency({
      scope: "booking",
      key: "action-unknown",
      state: "outcome_unknown",
    });
    await expect(repository.completeIdempotency({
      scope: "booking",
      key: "action-unknown",
      state: "confirmed",
      receiptId: "receipt-late",
    })).rejects.toThrow(/already terminal/);
  });
});

describe("bounded event streaming", () => {
  const event: PublicRuntimeEvent = {
    eventId: "event-1",
    eventName: "message.accepted",
    occurredAt: "2026-07-31T00:00:00.000Z",
    state: "DISCOVERY_IN_PROGRESS",
    outcome: "accepted",
    reasonCode: "MESSAGE_ACCEPTED",
  };

  it("delivers live public-safe events to the matching session", async () => {
    const hub = new BoundedEventStreamHub();
    const subscription = hub.subscribe("session-1");
    const pending = subscription.next();
    hub.publish(event, "session-1");
    expect(await pending).toEqual({ type: "event", event });
    subscription.cancel();
  });

  it("closes a slow consumer with a reset instead of unbounded buffering", async () => {
    const hub = new BoundedEventStreamHub();
    const subscription = hub.subscribe("session-1", 1);
    hub.publish(event, "session-1");
    hub.publish({ ...event, eventId: "event-2" }, "session-1");
    expect(await subscription.next()).toEqual({
      type: "reset",
      reasonCode: "STREAM_BACKPRESSURE_LIMIT",
    });
    expect(await subscription.next()).toBeNull();
  });

});

describe("configuration and dependency health", () => {
  it("loads a bounded configuration from an approved root", () => {
    const root = mkdtempSync(join(tmpdir(), "nova-config-"));
    const path = join(root, "staging.json");
    writeFileSync(path, JSON.stringify(stagingConfig()));
    expect(loadStagingConfigFile(path, { allowedRoot: root }).releaseId).toBe(
      "nova-web-r1-s002",
    );
  });

  it("rejects configuration outside the approved root", () => {
    const allowed = mkdtempSync(join(tmpdir(), "nova-allowed-"));
    const outside = mkdtempSync(join(tmpdir(), "nova-outside-"));
    const path = join(outside, "staging.json");
    writeFileSync(path, JSON.stringify(stagingConfig()));
    expect(() => loadStagingConfigFile(path, {
      allowedRoot: allowed,
    })).toThrow(ConfigurationLoadError);
  });

  it("fails readiness for unavailable critical dependencies", () => {
    const registry = new DependencyHealthRegistry();
    registry.update({
      name: "durable-state",
      state: "unavailable",
      critical: true,
      checkedAt: "2026-07-31T00:00:00.000Z",
      safeReasonCode: "STATE_UNAVAILABLE",
    });
    registry.update({
      name: "model",
      state: "disconnected",
      critical: true,
      checkedAt: "2026-07-31T00:00:00.000Z",
      safeReasonCode: "PROVIDER_DISCONNECTED",
    });
    expect(registry.snapshot()).toMatchObject({
      ready: false,
      externalWritesEnabled: false,
      blockers: ["durable-state:STATE_UNAVAILABLE"],
    });
  });

  it("keeps the migration free of transcript and secret columns", () => {
    const sql = readFileSync(new URL(
      "../migrations/0001_staging_foundation.sql",
      import.meta.url,
    ), "utf8");
    expect(sql).toContain("PRIMARY KEY (scope, idempotency_key)");
    expect(sql).not.toMatch(/\b(raw_message|transcript_text|secret_value)\b/i);
  });

  it("defines a non-root, health-checked, provider-disconnected container", () => {
    const dockerfile = readFileSync(new URL("../Dockerfile", import.meta.url), "utf8");
    expect(dockerfile).toContain("USER node");
    expect(dockerfile).toContain("HEALTHCHECK");
    expect(dockerfile).toContain("NOVA_BIND_HOST=0.0.0.0");
    expect(dockerfile).not.toMatch(/\b(OPENAI_API_KEY|GHL_TOKEN|SECRET=)\b/);
  });
});
