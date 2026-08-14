import { MOONROCK_GHL_FIELD_PROVISIONING } from "./ghl-production-registry.js";
import { loadGhlRuntimeConfig, redactedGhlRuntimeConfig } from "./ghl-runtime-config.js";
import type { HighLevelCustomField } from "./ghl-location-inspector.js";

interface CustomFieldListResponse {
  customFields?: HighLevelCustomField[];
}

interface CreateCustomFieldResponse {
  customField?: HighLevelCustomField;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const config = loadGhlRuntimeConfig();
  const baseUrl = config.baseUrl.replace(/\/$/, "");
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${config.privateIntegrationToken}`,
    Version: "v3",
  };

  const listResponse = await fetch(
    `${baseUrl}/locations/${encodeURIComponent(config.locationId)}/customFields?model=all`,
    { method: "GET", headers },
  );
  if (!listResponse.ok) throw new Error(`HighLevel field preflight failed (${listResponse.status}): ${await listResponse.text()}`);
  const existingPayload = await listResponse.json() as CustomFieldListResponse;
  const existing = Array.isArray(existingPayload.customFields) ? existingPayload.customFields : [];

  const plan = MOONROCK_GHL_FIELD_PROVISIONING.map((definition) => {
    const match = existing.find((field) =>
      field.model === definition.model &&
      (normalize(field.fieldKey) === normalize(definition.fieldKey) || normalize(field.name) === normalize(definition.name))
    );
    return { definition, existing: match };
  });

  const output: Record<string, unknown> = {
    mode: apply ? "apply" : "dry-run",
    config: redactedGhlRuntimeConfig(config),
    existing: plan.filter((item) => item.existing).map((item) => ({
      logicalKey: item.definition.logicalKey,
      id: item.existing?.id,
      name: item.existing?.name,
      fieldKey: item.existing?.fieldKey,
      model: item.existing?.model,
    })),
    pending: plan.filter((item) => !item.existing).map((item) => item.definition),
  };

  if (!apply) {
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    process.stdout.write("Dry run only. Re-run with --apply to create pending fields.\n");
    return;
  }

  const created: Array<Record<string, unknown>> = [];
  for (const item of plan) {
    if (item.existing) continue;
    const definition = item.definition;
    const response = await fetch(
      `${baseUrl}/locations/${encodeURIComponent(config.locationId)}/customFields`,
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: definition.name,
          dataType: definition.dataType,
          model: definition.model,
          placeholder: "",
        }),
      },
    );
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Failed creating ${definition.logicalKey} (${response.status}): ${text}`);
    }
    const payload = JSON.parse(text) as CreateCustomFieldResponse;
    created.push({
      logicalKey: definition.logicalKey,
      id: payload.customField?.id,
      name: payload.customField?.name ?? definition.name,
      fieldKey: payload.customField?.fieldKey,
      model: payload.customField?.model ?? definition.model,
    });
  }

  process.stdout.write(`${JSON.stringify({ ...output, created }, null, 2)}\n`);
  process.stdout.write("Provisioning complete. Run npm run inspect:ghl to verify registry resolution.\n");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown GHL provisioning failure";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
