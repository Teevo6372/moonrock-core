import { loadGhlRuntimeConfig, redactedGhlRuntimeConfig } from "./ghl-runtime-config.js";
import { MOONROCK_CONFIRMED_GHL_FIELDS, MOONROCK_GHL_PIPELINE } from "./ghl-production-registry.js";

const APPLY = process.argv.includes("--apply");
const TEST_EMAIL = "nova.integration.test@example.com";

const fieldIds = {
  recommendedOffer: "f99suFeJQk9gIqwLtboU",
  autonomousCloseAllowed: "xhokoSQR8bH8fRf7rWYC",
  industry: "sawfd5G93MRMFjg96RfZ",
  monthlyLeads: "NwYVzpLhCTHUDFBU2bFF",
  expectedVoiceMinutes: "lZYqPQI9BMUXfLAD4xAe",
  flightPlanStatus: "cVaTeGYQsaGRgcUjRww9",
  primaryBottleneck: "o4NIIqzKkENbZoZiF2vS",
  bottleneckCount: "s1rrAe4WOthKI1bxxo9i",
  estimatedMonthlyOpportunity: "usvl3t6DzplG8njv766c",
} as const;

async function main(): Promise<void> {
  const config = loadGhlRuntimeConfig();
  const contactBody = {
    locationId: config.locationId,
    firstName: "Nova",
    lastName: "Integration Test",
    name: "Nova Integration Test - Moonrock",
    companyName: "Moonrock Integration Test",
    email: TEST_EMAIL,
    source: "Nova Integration Test",
    customFields: [
      { id: MOONROCK_CONFIRMED_GHL_FIELDS.contact.path, fieldValue: "My business needs to grow" },
      { id: MOONROCK_CONFIRMED_GHL_FIELDS.contact.businessName, fieldValue: "Moonrock Integration Test" },
      { id: fieldIds.recommendedOffer, fieldValue: "AI Receptionist" },
      { id: fieldIds.autonomousCloseAllowed, fieldValue: "false" },
      { id: fieldIds.industry, fieldValue: "Integration Test" },
      { id: fieldIds.monthlyLeads, fieldValue: "25" },
      { id: fieldIds.expectedVoiceMinutes, fieldValue: "120" },
    ],
  };

  const opportunityTemplate = {
    pipelineId: MOONROCK_GHL_PIPELINE.pipelineId,
    locationId: config.locationId,
    name: "Nova Integration Test - Moonrock",
    pipelineStageId: MOONROCK_GHL_PIPELINE.inboundLeadStageId,
    status: "open",
    monetaryValue: 0,
    customFields: [
      { id: fieldIds.flightPlanStatus, fieldValue: "integration-test" },
      { id: fieldIds.primaryBottleneck, fieldValue: "Test-only controlled CRM write" },
      { id: fieldIds.bottleneckCount, fieldValue: "1" },
      { id: fieldIds.estimatedMonthlyOpportunity, fieldValue: "0" },
    ],
  };

  const plan = {
    mode: APPLY ? "apply" : "dry-run",
    config: redactedGhlRuntimeConfig(config),
    safety: {
      testOnly: true,
      autonomousCloseAllowed: false,
      followUpEnabled: false,
      contactEmail: TEST_EMAIL,
      pipeline: MOONROCK_GHL_PIPELINE.pipelineName,
      stage: MOONROCK_GHL_PIPELINE.inboundLeadStageName,
    },
    contact: contactBody,
    opportunity: opportunityTemplate,
  };

  if (!APPLY) {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    process.stdout.write("Dry run only. Re-run with --apply to perform the controlled CRM write.\n");
    return;
  }

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.privateIntegrationToken}`,
    Version: "v3",
  };

  const contactPayload = await postJson<{ contact?: { id?: string }; id?: string }>(
    `${config.baseUrl}/contacts/upsert`,
    headers,
    contactBody,
    "contact upsert",
  );
  const contactId = contactPayload.contact?.id ?? contactPayload.id;
  if (!contactId) throw new Error("HighLevel contact upsert succeeded without returning a contact ID");

  const opportunityPayload = await postJson<{ opportunity?: { id?: string }; id?: string }>(
    `${config.baseUrl}/opportunities/upsert`,
    headers,
    { ...opportunityTemplate, contactId },
    "opportunity upsert",
  );
  const opportunityId = opportunityPayload.opportunity?.id ?? opportunityPayload.id;
  if (!opportunityId) throw new Error("HighLevel opportunity upsert succeeded without returning an opportunity ID");

  process.stdout.write(`${JSON.stringify({
    mode: "apply",
    config: redactedGhlRuntimeConfig(config),
    contact: { id: contactId, email: TEST_EMAIL, name: contactBody.name },
    opportunity: {
      id: opportunityId,
      name: opportunityTemplate.name,
      pipelineId: opportunityTemplate.pipelineId,
      pipelineStageId: opportunityTemplate.pipelineStageId,
      status: opportunityTemplate.status,
    },
    safety: plan.safety,
  }, null, 2)}\n`);
}

async function postJson<T>(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  label: string,
): Promise<T> {
  const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await response.text();
  if (!response.ok) throw new Error(`HighLevel ${label} failed (${response.status}): ${text}`);
  return text ? JSON.parse(text) as T : {} as T;
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Unknown controlled GHL write failure"}\n`);
  process.exitCode = 1;
});
