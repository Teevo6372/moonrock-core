import { describe, expect, it, vi } from "vitest";
import {
  GhlSandboxAdapter,
  GhlSandboxError,
  KillSwitch,
  evaluateGhlSandboxReadiness,
  validateGhlSandboxManifest,
  type GhlSandboxManifest,
  type GhlSandboxRequest,
  type GhlSandboxTransport,
  type GhlSandboxTransportResult,
  type SyntheticWriteAuthorization,
} from "../src/index.js";

const manifest: GhlSandboxManifest = {
  manifestId: "nova-ghl-sandbox-candidate-001",
  environment: "non-production",
  locationReference: "sandbox:location:nova-r1",
  credentialReference: "secretref://nova/staging/ghl-private-integration",
  approvedScopes: [
    "contacts.readonly",
    "contacts.write",
    "opportunities.write",
    "tasks.write",
    "calendars.readonly",
    "calendars.write",
  ],
  mappings: {
    location: "sandbox:location:nova-r1",
    pipelineNewBusiness: "sandbox:pipeline:new-business",
    stageNovaIntake: "sandbox:stage:nova-intake",
    stageHumanReview: "sandbox:stage:human-review",
    stageDiscoveryRequested: "sandbox:stage:discovery-requested",
    stageDiscoveryBooked: "sandbox:stage:discovery-booked",
    stageNurture: "sandbox:stage:nurture",
    calendarFlightPlan: "sandbox:calendar:flight-plan",
    ownerGeneral: "sandbox:owner:general",
    ownerPrivacy: "sandbox:owner:privacy",
    ownerSecurity: "sandbox:owner:security",
    ownerBilling: "sandbox:owner:billing",
  },
  mappingReviewReference: "review:crm-mapping-test",
  scopeReviewReference: "review:security-scope-test",
  cleanupOwnerReference: "owner:cleanup-test",
  reconciliationOwnerReference: "owner:reconciliation-test",
  externalWritesEnabled: false,
};

const authorization: SyntheticWriteAuthorization = {
  authorizationId: "ghl-write-window-test-001",
  approvedBy: "owner:test",
  validFrom: "2026-07-31T00:00:00.000Z",
  expiresAt: "2026-07-31T01:00:00.000Z",
  maxWrites: 3,
  allowedTools: ["create_contact", "request_appointment"],
  fixturePrefix: "NOVA-SYNTHETIC-",
};

function confirmed(
  request: GhlSandboxRequest,
  providerObjectId = "sandbox:object:001",
): GhlSandboxTransportResult {
  return {
    status: "confirmed",
    providerObjectId,
    providerStatus: "confirmed",
    idempotencyKey: request.idempotencyKey,
    recordedAt: "2026-07-31T00:10:00.000Z",
    ...(request.tool === "request_appointment"
      ? {
          appointment: {
            start: "2026-08-01T15:00:00.000Z",
            timeZone: "America/Chicago",
          },
        }
      : {}),
  };
}

function transport(
  overrides: Partial<GhlSandboxTransport> = {},
): GhlSandboxTransport {
  return {
    send: async (request) => confirmed(request),
    reconcile: async (request) => confirmed(request),
    cleanup: async () => ({ status: "deleted" }),
    ...overrides,
  };
}

function adapter(
  provider = transport(),
  writeAuthorization: SyntheticWriteAuthorization | null = authorization,
  killSwitch = new KillSwitch(),
  timeoutMs = 100,
) {
  return new GhlSandboxAdapter(
    manifest,
    writeAuthorization,
    provider,
    killSwitch,
    timeoutMs,
    () => new Date("2026-07-31T00:15:00.000Z"),
  );
}

describe("GHL sandbox manifest", () => {
  it("accepts only a disconnected-write non-production manifest", () => {
    expect(validateGhlSandboxManifest(manifest)).toEqual(manifest);
    expect(() =>
      validateGhlSandboxManifest({
        ...manifest,
        environment: "production",
      } as unknown as GhlSandboxManifest),
    ).toThrow(GhlSandboxError);
    expect(() =>
      validateGhlSandboxManifest({
        ...manifest,
        externalWritesEnabled: true,
      } as unknown as GhlSandboxManifest),
    ).toThrow("manifest_invalid");
  });

  it("rejects unapproved scopes and non-sandbox mappings", () => {
    expect(() =>
      validateGhlSandboxManifest({
        ...manifest,
        approvedScopes: [...manifest.approvedScopes, "locations.write"],
      }),
    ).toThrow("manifest_invalid");
    expect(() =>
      validateGhlSandboxManifest({
        ...manifest,
        mappings: { ...manifest.mappings, location: "production-location-id" },
      }),
    ).toThrow("manifest_invalid");
  });

  it("reports every unresolved human readiness gate", () => {
    expect(
      evaluateGhlSandboxReadiness({
        ...manifest,
        mappingReviewReference: null,
        scopeReviewReference: null,
        cleanupOwnerReference: null,
        reconciliationOwnerReference: null,
      }),
    ).toEqual({
      readsReady: false,
      syntheticWritesReady: false,
      blockers: [
        "mapping_review",
        "scope_review",
        "cleanup_owner",
        "reconciliation_owner",
      ],
      decisionAuthority: "HUMAN_RELEASE_OWNER",
      externalWritesEnabled: false,
    });
  });
});

describe("GHL sandbox adapter", () => {
  it("allows a least-privilege read without write authorization", async () => {
    const send = vi.fn<GhlSandboxTransport["send"]>(async (request) =>
      confirmed(request),
    );
    const result = await adapter(transport({ send }), null).execute({
      tool: "find_contact_candidates",
      args: { email: "synthetic@example.test" },
      idempotencyKey: "read:001",
    });
    expect(result.status).toBe("confirmed");
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        tool: "find_contact_candidates",
        locationReference: "sandbox:location:nova-r1",
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("blocks synthetic writes without an explicit window", async () => {
    await expect(
      adapter(transport(), null).execute({
        tool: "create_contact",
        args: { fixtureLabel: "NOVA-SYNTHETIC-001" },
        idempotencyKey: "write:001",
      }),
    ).rejects.toMatchObject({ code: "write_not_authorized" });
  });

  it("enforces scope, argument, fixture, tool, window, and write bounds", async () => {
    const limitedManifest = {
      ...manifest,
      approvedScopes: ["contacts.readonly"],
    };
    const scopeAdapter = new GhlSandboxAdapter(
      limitedManifest,
      authorization,
      transport(),
      new KillSwitch(),
      100,
      () => new Date("2026-07-31T00:15:00.000Z"),
    );
    await expect(
      scopeAdapter.execute({
        tool: "create_contact",
        args: { fixtureLabel: "NOVA-SYNTHETIC-001" },
        idempotencyKey: "write:scope",
      }),
    ).rejects.toMatchObject({ code: "scope_denied" });
    await expect(
      adapter().execute({
        tool: "create_contact",
        args: { password: "not-allowed", fixtureLabel: "NOVA-SYNTHETIC-001" },
        idempotencyKey: "write:args",
      }),
    ).rejects.toMatchObject({ code: "argument_denied" });
    await expect(
      adapter().execute({
        tool: "create_contact",
        args: { fixtureLabel: "REAL-001" },
        idempotencyKey: "write:fixture",
      }),
    ).rejects.toMatchObject({ code: "fixture_boundary" });
    await expect(
      adapter().execute({
        tool: "record_escalation",
        args: { fixtureLabel: "NOVA-SYNTHETIC-001" },
        idempotencyKey: "write:tool",
      }),
    ).rejects.toMatchObject({ code: "write_limit" });

    const closed = { ...authorization, expiresAt: "2026-07-31T00:14:00.000Z" };
    await expect(
      adapter(transport(), closed).execute({
        tool: "create_contact",
        args: { fixtureLabel: "NOVA-SYNTHETIC-001" },
        idempotencyKey: "write:window",
      }),
    ).rejects.toMatchObject({ code: "write_window_closed" });
  });

  it("deduplicates confirmed writes and records cleanup", async () => {
    const send = vi.fn<GhlSandboxTransport["send"]>(async (request) =>
      confirmed(request),
    );
    const cleanup = vi.fn<GhlSandboxTransport["cleanup"]>(async () => ({
      status: "deleted",
    }));
    const sandbox = adapter(transport({ send, cleanup }));
    const input = {
      tool: "create_contact",
      args: { email: "synthetic@example.test", fixtureLabel: "NOVA-SYNTHETIC-001" },
      idempotencyKey: "write:dedupe",
    };
    const first = await sandbox.execute(input);
    const second = await sandbox.execute(input);
    expect(second).toEqual(first);
    expect(send).toHaveBeenCalledTimes(1);
    expect(await sandbox.cleanup()).toMatchObject({
      attempted: 1,
      removed: 1,
      failed: 0,
      complete: true,
    });
  });

  it("requires reconciliation after an unknown outcome", async () => {
    const send = vi
      .fn<GhlSandboxTransport["send"]>()
      .mockResolvedValue({ status: "outcome_unknown" });
    const reconcile = vi.fn<GhlSandboxTransport["reconcile"]>(
      async (request) => confirmed(request),
    );
    const sandbox = adapter(transport({ send, reconcile }));
    const input = {
      tool: "create_contact" as const,
      args: { fixtureLabel: "NOVA-SYNTHETIC-001" },
      idempotencyKey: "write:unknown",
    };
    await expect(sandbox.execute(input)).resolves.toEqual({
      status: "outcome_unknown",
    });
    await expect(sandbox.execute(input)).rejects.toMatchObject({
      code: "reconciliation_required",
    });
    await expect(sandbox.reconcile(input)).resolves.toMatchObject({
      status: "confirmed",
      providerObjectId: "sandbox:object:001",
    });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("validates authoritative appointment receipts", async () => {
    const invalid = transport({
      send: async (request) => {
        const result = confirmed(request);
        if (result.status === "confirmed") delete result.appointment;
        return result;
      },
    });
    await expect(
      adapter(invalid).execute({
        tool: "request_appointment",
        args: {
          contactId: "sandbox:contact:001",
          calendar: "CALENDAR_FLIGHT_PLAN",
          slotStart: "2026-08-01T15:00:00.000Z",
          timeZone: "America/Chicago",
          actionId: "synthetic-action-001",
          fixtureLabel: "NOVA-SYNTHETIC-001",
        },
        idempotencyKey: "booking:001",
      }),
    ).rejects.toMatchObject({ code: "receipt_invalid" });
  });

  it("blocks all calls when the kill switch is active", async () => {
    const send = vi.fn<GhlSandboxTransport["send"]>();
    const killSwitch = new KillSwitch();
    killSwitch.enable();
    await expect(
      adapter(transport({ send }), authorization, killSwitch).execute({
        tool: "find_contact_candidates",
        args: { email: "synthetic@example.test" },
        idempotencyKey: "read:killed",
      }),
    ).rejects.toMatchObject({ code: "kill_switch" });
    expect(send).not.toHaveBeenCalled();
  });

  it("times out and aborts stalled transport", async () => {
    let aborted = false;
    const stalled = transport({
      send: async (_request, { signal }) =>
        new Promise((resolve) => {
          signal.addEventListener("abort", () => {
            aborted = true;
            resolve({ status: "outcome_unknown" });
          });
        }),
    });
    await expect(
      adapter(stalled, authorization, new KillSwitch(), 5).execute({
        tool: "find_contact_candidates",
        args: { email: "synthetic@example.test" },
        idempotencyKey: "read:timeout",
      }),
    ).rejects.toMatchObject({ code: "timeout" });
    expect(aborted).toBe(true);
  });
});
