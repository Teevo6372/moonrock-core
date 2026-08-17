import type { DiagnosticInput, DiagnosticResult } from "./diagnostic-engine.js";
import { AI_EMPLOYEE_CATALOG } from "./ai-employee-catalog.js";
import type { FlightPlan } from "./flight-plan.js";
import { buildGhlFlightPlanSyncPlan } from "./ghl-flight-plan-sync.js";
import type { GhlFieldRegistry } from "./ghl-field-registry.js";
import { MOONROCK_GHL_PIPELINE } from "./ghl-production-registry.js";

export interface ProductionGhlContactIdentity {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  companyName?: string;
}

export interface ProductionGhlHandoffConfig {
  enabled: boolean;
  fieldsVerified: boolean;
  writesEnabled: boolean;
  locationId: string;
  accessToken: string;
  baseUrl?: string;
  fieldRegistry: GhlFieldRegistry;
}

export interface ProductionGhlHandoffInput {
  sessionId: string;
  identity: ProductionGhlContactIdentity;
  diagnosticInput: DiagnosticInput;
  diagnostic: DiagnosticResult;
  flightPlan: FlightPlan;
}

export interface ProductionGhlHandoffResult {
  status: "dry_run" | "confirmed";
  contactId?: string;
  opportunityId?: string;
  autonomousCloseAllowed: false;
  followUpEnabled: false;
  deferredOperations: readonly ["add_tags", "add_note"];
}

export class ProductionGhlHandoffBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductionGhlHandoffBlockedError";
  }
}

export async function handoffFlightPlanToGhl(
  input: ProductionGhlHandoffInput,
  config: ProductionGhlHandoffConfig,
  options: { apply?: boolean; fetchImpl?: typeof fetch } = {},
): Promise<ProductionGhlHandoffResult> {
  assertProductionHandoffReady(input, config);

  const plan = buildGhlFlightPlanSyncPlan({
    sessionId: input.sessionId,
    diagnosticInput: input.diagnosticInput,
    diagnostic: input.diagnostic,
    flightPlan: input.flightPlan,
    fieldRegistry: config.fieldRegistry,
  });

  if (!options.apply) {
    return {
      status: "dry_run",
      autonomousCloseAllowed: false,
      followUpEnabled: false,
      deferredOperations: ["add_tags", "add_note"],
    };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = (config.baseUrl ?? "https://services.leadconnectorhq.com").replace(/\/$/, "");
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.accessToken}`,
    Version: "v3",
  };

  const contactOperation = plan.operations.find((operation) => operation.kind === "upsert_contact");
  const opportunityOperation = plan.operations.find((operation) => operation.kind === "upsert_opportunity");
  if (!contactOperation || !opportunityOperation) {
    throw new ProductionGhlHandoffBlockedError("Flight Plan sync plan is missing required CRM write operations");
  }

  const contactPayload = await postJson<{ contact?: { id?: string }; id?: string }>(
    fetchImpl,
    `${baseUrl}/contacts/upsert`,
    headers,
    {
      locationId: config.locationId,
      email: input.identity.email.trim(),
      ...(input.identity.firstName ? { firstName: input.identity.firstName } : {}),
      ...(input.identity.lastName ? { lastName: input.identity.lastName } : {}),
      ...(input.identity.phone ? { phone: input.identity.phone } : {}),
      companyName: input.identity.companyName ?? input.diagnosticInput.businessName ?? input.flightPlan.businessName,
      source: "Nova Moonrock 2",
      customFields: Object.entries(contactOperation.fields).map(([id, value]) => ({
        id,
        fieldValue: normalizeContactFieldValue(id, value, config.fieldRegistry),
      })),
    },
    "contact upsert",
  );
  const contactId = contactPayload.contact?.id ?? contactPayload.id;
  if (!contactId) throw new Error("HighLevel contact upsert succeeded without returning a contact ID");

  const opportunityPayload = await postJson<{ opportunity?: { id?: string }; id?: string }>(
    fetchImpl,
    `${baseUrl}/opportunities/upsert`,
    headers,
    {
      locationId: config.locationId,
      pipelineId: MOONROCK_GHL_PIPELINE.pipelineId,
      pipelineStageId: MOONROCK_GHL_PIPELINE.inboundLeadStageId,
      contactId,
      name: `${input.flightPlan.businessName} — Nova Flight Plan`,
      status: "open",
      monetaryValue: input.diagnostic.opportunityEstimate?.monthlyOpportunityUsd ?? 0,
      customFields: Object.entries(opportunityOperation.fields).map(([id, value]) => ({ id, fieldValue: value })),
    },
    "opportunity upsert",
  );
  const opportunityId = opportunityPayload.opportunity?.id ?? opportunityPayload.id;
  if (!opportunityId) throw new Error("HighLevel opportunity upsert succeeded without returning an opportunity ID");

  return {
    status: "confirmed",
    contactId,
    opportunityId,
    autonomousCloseAllowed: false,
    followUpEnabled: false,
    deferredOperations: ["add_tags", "add_note"],
  };
}

function assertProductionHandoffReady(input: ProductionGhlHandoffInput, config: ProductionGhlHandoffConfig): void {
  if (!config.enabled) throw new ProductionGhlHandoffBlockedError("Production GHL handoff is disabled");
  if (!config.fieldsVerified) throw new ProductionGhlHandoffBlockedError("Production GHL field registry is not verified");
  if (!config.writesEnabled) throw new ProductionGhlHandoffBlockedError("Production GHL writes are not enabled");
  if (!config.locationId.trim()) throw new ProductionGhlHandoffBlockedError("GHL location ID is required");
  if (!config.accessToken.trim()) throw new ProductionGhlHandoffBlockedError("GHL access token is required");
  if (!input.identity.email.trim()) throw new ProductionGhlHandoffBlockedError("A verified lead email is required before CRM handoff");
  if (input.diagnostic.escalationReasons.some((reason) => reason.toLowerCase().includes("illegal"))) {
    throw new ProductionGhlHandoffBlockedError("Illegal or abusive requests cannot enter the automated CRM handoff");
  }
}

function normalizeContactFieldValue(
  id: string,
  value: string | number | boolean,
  registry: GhlFieldRegistry,
): string | number | boolean {
  if (id === registry.contact.autonomousCloseAllowed) return "false";
  if (id === registry.contact.recommendedOffer && typeof value === "string" && value in AI_EMPLOYEE_CATALOG) {
    return AI_EMPLOYEE_CATALOG[value as keyof typeof AI_EMPLOYEE_CATALOG].name;
  }
  if (id !== registry.contact.path) return value;
  if (value === "startup") return "I'm starting something";
  if (value === "existing_business") return "My business needs to grow";
  return value;
}

async function postJson<T>(
  fetchImpl: typeof fetch,
  url: string,
  headers: Record<string, string>,
  body: unknown,
  label: string,
): Promise<T> {
  const response = await fetchImpl(url, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await response.text();
  if (!response.ok) throw new Error(`HighLevel ${label} failed (${response.status}): ${text}`);
  return text ? JSON.parse(text) as T : {} as T;
}
