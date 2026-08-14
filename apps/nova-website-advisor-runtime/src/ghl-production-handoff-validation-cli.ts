import { diagnoseBusiness, type DiagnosticInput } from "./diagnostic-engine.js";
import { buildFlightPlan } from "./flight-plan.js";
import { handoffFlightPlanToGhl } from "./ghl-production-handoff.js";
import { MOONROCK_PRODUCTION_GHL_FIELD_REGISTRY } from "./ghl-production-registry.js";
import { loadGhlRuntimeConfig, redactedGhlRuntimeConfig } from "./ghl-runtime-config.js";

async function main(): Promise<void> {
  const runtime = loadGhlRuntimeConfig();
  const diagnosticInput: DiagnosticInput = {
    path: "existing_business",
    businessName: "Moonrock Handoff Validation",
    industry: "Home Services",
    monthlyLeads: 40,
    missedCallsPerMonth: 12,
    averageJobValueUsd: 450,
    closeRatePercent: 35,
    medianLeadResponseMinutes: 18,
    appointmentsNeedManualScheduling: true,
    estimatesNeedManualFollowUp: true,
    repetitiveSupportLoad: "medium",
    reviewRequestProcess: "manual",
    dormantCustomerList: true,
    founderHandlesMostAdmin: false,
    departmentsAffected: 1,
    requestedCustomIntegrations: 0,
    expectedVoiceMinutesPerMonth: 240,
    riskCategories: [],
  };

  const diagnostic = diagnoseBusiness(diagnosticInput);
  const flightPlan = buildFlightPlan(diagnosticInput, diagnostic);
  const handoff = await handoffFlightPlanToGhl({
    sessionId: "validation-production-handoff-001",
    identity: {
      email: "nova.production.handoff.validation@example.com",
      firstName: "Nova",
      lastName: "Production Handoff Validation",
      companyName: diagnosticInput.businessName,
    },
    diagnosticInput,
    diagnostic,
    flightPlan,
  }, {
    enabled: true,
    fieldsVerified: true,
    writesEnabled: true,
    locationId: runtime.locationId,
    accessToken: runtime.privateIntegrationToken,
    baseUrl: runtime.baseUrl,
    fieldRegistry: MOONROCK_PRODUCTION_GHL_FIELD_REGISTRY,
  }, {
    apply: false,
  });

  process.stdout.write(`${JSON.stringify({
    mode: "dry-run",
    config: redactedGhlRuntimeConfig(runtime),
    diagnosticInput,
    diagnostic,
    flightPlan,
    handoff,
    safety: {
      crmWritePerformed: false,
      autonomousCloseEnabled: false,
      followUpEnabled: false,
    },
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Unknown production handoff validation failure"}\n`);
  process.exitCode = 1;
});
