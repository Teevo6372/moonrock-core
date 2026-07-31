import type { GhlAdapter, ProviderReceipt } from "./adapters.js";
import type { ToolName } from "./domain.js";
import type { KillSwitch } from "./kill-switch.js";

export const ghlReadTools = [
  "find_contact_candidates",
  "list_approved_slots",
] as const satisfies readonly ToolName[];

export const ghlWriteTools = [
  "create_contact",
  "update_contact_with_consent",
  "create_opportunity_for_review",
  "create_follow_up_task",
  "request_appointment",
  "record_conversation_summary",
  "record_consent_evidence",
  "record_escalation",
] as const satisfies readonly ToolName[];

export interface GhlSandboxMappings {
  location: string;
  pipelineNewBusiness: string;
  stageNovaIntake: string;
  stageHumanReview: string;
  stageDiscoveryRequested: string;
  stageDiscoveryBooked: string;
  stageNurture: string;
  calendarFlightPlan: string;
  ownerGeneral: string;
  ownerPrivacy: string;
  ownerSecurity: string;
  ownerBilling: string;
}

export interface GhlSandboxManifest {
  manifestId: string;
  environment: "non-production";
  locationReference: string;
  credentialReference: `secretref://${string}`;
  approvedScopes: string[];
  mappings: GhlSandboxMappings;
  mappingReviewReference: string | null;
  scopeReviewReference: string | null;
  cleanupOwnerReference: string | null;
  reconciliationOwnerReference: string | null;
  externalWritesEnabled: false;
}

export interface SyntheticWriteAuthorization {
  authorizationId: string;
  approvedBy: string;
  validFrom: string;
  expiresAt: string;
  maxWrites: number;
  allowedTools: Array<(typeof ghlWriteTools)[number]>;
  fixturePrefix: string;
}

export interface GhlSandboxReadinessDecision {
  readsReady: boolean;
  syntheticWritesReady: boolean;
  blockers: string[];
  decisionAuthority: "HUMAN_RELEASE_OWNER";
  externalWritesEnabled: false;
}

export interface GhlSandboxRequest {
  tool: ToolName;
  args: Record<string, unknown>;
  idempotencyKey: string;
  locationReference: string;
}

export type GhlSandboxTransportResult =
  | {
      status: "confirmed";
      providerObjectId: string;
      providerStatus: string;
      idempotencyKey: string;
      recordedAt: string;
      appointment?: {
        start: string;
        timeZone: string;
      };
    }
  | { status: "outcome_unknown" };

export interface GhlSandboxTransport {
  send(
    request: GhlSandboxRequest,
    options: { signal: AbortSignal },
  ): Promise<GhlSandboxTransportResult>;
  reconcile(
    request: GhlSandboxRequest,
    options: { signal: AbortSignal },
  ): Promise<GhlSandboxTransportResult | { status: "absent" }>;
  cleanup(
    object: CleanupObject,
    options: { signal: AbortSignal },
  ): Promise<{ status: "deleted" | "not_found" }>;
}

export interface CleanupObject {
  tool: (typeof ghlWriteTools)[number];
  providerObjectId: string;
  createdAt: string;
}

export interface CleanupEvidence {
  authorizationId: string;
  attempted: number;
  removed: number;
  alreadyAbsent: number;
  failed: number;
  complete: boolean;
  completedAt: string;
}

export type GhlSandboxErrorCode =
  | "manifest_invalid"
  | "scope_denied"
  | "write_not_authorized"
  | "write_window_closed"
  | "write_limit"
  | "fixture_boundary"
  | "argument_denied"
  | "kill_switch"
  | "receipt_invalid"
  | "reconciliation_required"
  | "timeout";

export class GhlSandboxError extends Error {
  constructor(readonly code: GhlSandboxErrorCode) {
    super(`GHL sandbox action denied: ${code}`);
    this.name = "GhlSandboxError";
  }
}

const requiredScopes: Record<ToolName, string> = {
  find_contact_candidates: "contacts.readonly",
  create_contact: "contacts.write",
  update_contact_with_consent: "contacts.write",
  create_opportunity_for_review: "opportunities.write",
  create_follow_up_task: "tasks.write",
  list_approved_slots: "calendars.readonly",
  request_appointment: "calendars.write",
  record_conversation_summary: "contacts.write",
  record_consent_evidence: "contacts.write",
  record_escalation: "tasks.write",
};

const allowedScopes = new Set(Object.values(requiredScopes));
const opaqueReference = /^[a-z0-9][a-z0-9._:-]{2,127}$/;
const allowedArguments: Record<ToolName, ReadonlySet<string>> = {
  find_contact_candidates: new Set(["email", "phone"]),
  create_contact: new Set([
    "firstName",
    "lastName",
    "email",
    "phone",
    "companyName",
    "websiteDomain",
    "serviceArea",
    "preferredChannel",
    "sourcePagePath",
    "conversationId",
    "disclosureVersion",
    "fixtureLabel",
  ]),
  update_contact_with_consent: new Set([
    "contactId",
    "firstName",
    "lastName",
    "email",
    "phone",
    "companyName",
    "websiteDomain",
    "serviceArea",
    "preferredChannel",
    "fixtureLabel",
  ]),
  create_opportunity_for_review: new Set([
    "contactId",
    "intent",
    "stage",
    "owner",
    "fixtureLabel",
  ]),
  create_follow_up_task: new Set([
    "contactId",
    "owner",
    "dueAt",
    "summary",
    "fixtureLabel",
  ]),
  list_approved_slots: new Set(["calendar", "start", "end", "timeZone"]),
  request_appointment: new Set([
    "contactId",
    "calendar",
    "slotStart",
    "timeZone",
    "actionId",
    "fixtureLabel",
  ]),
  record_conversation_summary: new Set([
    "contactId",
    "summary",
    "fixtureLabel",
  ]),
  record_consent_evidence: new Set([
    "contactId",
    "category",
    "status",
    "disclosureVersion",
    "actionId",
    "occurredAt",
    "fixtureLabel",
  ]),
  record_escalation: new Set([
    "contactId",
    "route",
    "severity",
    "reasonCode",
    "owner",
    "fixtureLabel",
  ]),
};

export function validateGhlSandboxManifest(
  value: GhlSandboxManifest,
): GhlSandboxManifest {
  if (
    value.environment !== "non-production" ||
    !value.manifestId ||
    !opaqueReference.test(value.locationReference) ||
    !value.credentialReference.startsWith("secretref://") ||
    value.externalWritesEnabled !== false
  ) {
    throw new GhlSandboxError("manifest_invalid");
  }
  if (
    value.approvedScopes.length === 0 ||
    value.approvedScopes.some((scope) => !allowedScopes.has(scope))
  ) {
    throw new GhlSandboxError("manifest_invalid");
  }
  if (
    Object.values(value.mappings).some(
      (mapping) => !opaqueReference.test(mapping) || !mapping.startsWith("sandbox:"),
    )
  ) {
    throw new GhlSandboxError("manifest_invalid");
  }
  return structuredClone(value);
}

export function evaluateGhlSandboxReadiness(
  value: GhlSandboxManifest,
): GhlSandboxReadinessDecision {
  validateGhlSandboxManifest(value);
  const blockers: string[] = [];
  if (!value.mappingReviewReference) blockers.push("mapping_review");
  if (!value.scopeReviewReference) blockers.push("scope_review");
  const readsReady = blockers.length === 0;
  if (!value.cleanupOwnerReference) blockers.push("cleanup_owner");
  if (!value.reconciliationOwnerReference) blockers.push("reconciliation_owner");
  return {
    readsReady,
    syntheticWritesReady: blockers.length === 0,
    blockers,
    decisionAuthority: "HUMAN_RELEASE_OWNER",
    externalWritesEnabled: false,
  };
}

function isWriteTool(tool: ToolName): tool is (typeof ghlWriteTools)[number] {
  return (ghlWriteTools as readonly ToolName[]).includes(tool);
}

export class GhlSandboxAdapter implements GhlAdapter {
  readonly #receipts = new Map<string, ProviderReceipt>();
  readonly #unknown = new Set<string>();
  readonly #cleanup: CleanupObject[] = [];
  #writeCount = 0;

  constructor(
    private readonly manifest: GhlSandboxManifest,
    private readonly authorization: SyntheticWriteAuthorization | null,
    private readonly transport: GhlSandboxTransport,
    private readonly killSwitch: KillSwitch,
    private readonly timeoutMs = 10_000,
    private readonly now: () => Date = () => new Date(),
  ) {
    validateGhlSandboxManifest(manifest);
    if (!evaluateGhlSandboxReadiness(manifest).readsReady) {
      throw new GhlSandboxError("manifest_invalid");
    }
  }

  async execute(input: {
    tool: string;
    args: Record<string, unknown>;
    idempotencyKey: string;
  }): Promise<ProviderReceipt | { status: "outcome_unknown" }> {
    if (this.killSwitch.enabled) throw new GhlSandboxError("kill_switch");
    if (!(input.tool in requiredScopes)) throw new GhlSandboxError("scope_denied");
    const tool = input.tool as ToolName;
    if (!this.manifest.approvedScopes.includes(requiredScopes[tool])) {
      throw new GhlSandboxError("scope_denied");
    }
    this.#validateArguments(tool, input.args);
    const existing = this.#receipts.get(input.idempotencyKey);
    if (existing) return structuredClone(existing);
    if (this.#unknown.has(input.idempotencyKey)) {
      throw new GhlSandboxError("reconciliation_required");
    }
    if (isWriteTool(tool)) this.#authorizeWrite(tool, input.args);
    const request: GhlSandboxRequest = {
      tool,
      args: structuredClone(input.args),
      idempotencyKey: input.idempotencyKey,
      locationReference: this.manifest.locationReference,
    };
    const result = await this.#withTimeout((signal) =>
      this.transport.send(request, { signal }),
    );
    if (result.status === "outcome_unknown") {
      this.#unknown.add(input.idempotencyKey);
      return result;
    }
    const receipt = this.#validateReceipt(request, result);
    this.#receipts.set(input.idempotencyKey, receipt);
    if (isWriteTool(tool)) {
      this.#writeCount += 1;
      this.#cleanup.push({
        tool,
        providerObjectId: result.providerObjectId,
        createdAt: result.recordedAt,
      });
    }
    return structuredClone(receipt);
  }

  async reconcile(input: {
    tool: ToolName;
    args: Record<string, unknown>;
    idempotencyKey: string;
  }): Promise<ProviderReceipt | { status: "absent" | "outcome_unknown" }> {
    if (!this.#unknown.has(input.idempotencyKey)) {
      const receipt = this.#receipts.get(input.idempotencyKey);
      return receipt ? structuredClone(receipt) : { status: "absent" };
    }
    const request: GhlSandboxRequest = {
      ...input,
      args: structuredClone(input.args),
      locationReference: this.manifest.locationReference,
    };
    const result = await this.#withTimeout((signal) =>
      this.transport.reconcile(request, { signal }),
    );
    if (result.status === "absent" || result.status === "outcome_unknown") {
      if (result.status === "absent") this.#unknown.delete(input.idempotencyKey);
      return result;
    }
    const receipt = this.#validateReceipt(request, result);
    this.#unknown.delete(input.idempotencyKey);
    this.#receipts.set(input.idempotencyKey, receipt);
    if (isWriteTool(input.tool)) {
      this.#cleanup.push({
        tool: input.tool,
        providerObjectId: result.providerObjectId,
        createdAt: result.recordedAt,
      });
    }
    return receipt;
  }

  async cleanup(): Promise<CleanupEvidence> {
    if (!this.authorization) throw new GhlSandboxError("write_not_authorized");
    let removed = 0;
    let alreadyAbsent = 0;
    let failed = 0;
    for (const object of [...this.#cleanup].reverse()) {
      try {
        const result = await this.#withTimeout((signal) =>
          this.transport.cleanup(object, { signal }),
        );
        if (result.status === "deleted") removed += 1;
        else alreadyAbsent += 1;
      } catch {
        failed += 1;
      }
    }
    return {
      authorizationId: this.authorization.authorizationId,
      attempted: this.#cleanup.length,
      removed,
      alreadyAbsent,
      failed,
      complete: failed === 0,
      completedAt: this.now().toISOString(),
    };
  }

  #authorizeWrite(
    tool: (typeof ghlWriteTools)[number],
    args: Record<string, unknown>,
  ): void {
    const authorization = this.authorization;
    if (!authorization) throw new GhlSandboxError("write_not_authorized");
    if (!evaluateGhlSandboxReadiness(this.manifest).syntheticWritesReady) {
      throw new GhlSandboxError("write_not_authorized");
    }
    const now = this.now().getTime();
    if (
      now < new Date(authorization.validFrom).getTime() ||
      now >= new Date(authorization.expiresAt).getTime()
    ) {
      throw new GhlSandboxError("write_window_closed");
    }
    if (
      !authorization.allowedTools.includes(tool) ||
      this.#writeCount >= authorization.maxWrites
    ) {
      throw new GhlSandboxError("write_limit");
    }
    if (
      typeof args.fixtureLabel !== "string" ||
      !args.fixtureLabel.startsWith(authorization.fixturePrefix)
    ) {
      throw new GhlSandboxError("fixture_boundary");
    }
  }

  #validateArguments(tool: ToolName, args: Record<string, unknown>): void {
    if (Object.keys(args).some((key) => !allowedArguments[tool].has(key))) {
      throw new GhlSandboxError("argument_denied");
    }
  }

  #validateReceipt(
    request: GhlSandboxRequest,
    result: Extract<GhlSandboxTransportResult, { status: "confirmed" }>,
  ): ProviderReceipt {
    if (
      !opaqueReference.test(result.providerObjectId) ||
      result.idempotencyKey !== request.idempotencyKey ||
      result.providerStatus !== "confirmed" ||
      !Number.isFinite(new Date(result.recordedAt).getTime()) ||
      (request.tool === "request_appointment" &&
        (!result.appointment ||
          !Number.isFinite(new Date(result.appointment.start).getTime()) ||
          !result.appointment.timeZone))
    ) {
      throw new GhlSandboxError("receipt_invalid");
    }
    return {
      receiptId: `ghl-sandbox:${result.providerObjectId}`,
      providerObjectId: result.providerObjectId,
      status: "confirmed",
      recordedAt: result.recordedAt,
    };
  }

  async #withTimeout<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        operation(controller.signal),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new GhlSandboxError("timeout"));
          }, this.timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
