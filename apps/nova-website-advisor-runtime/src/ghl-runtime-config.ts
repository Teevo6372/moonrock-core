export interface GhlRuntimeConfig {
  locationId: string;
  privateIntegrationToken: string;
  baseUrl: string;
}

export const MOONROCK_GHL_LOCATION_ID = "RX0RvGiTSimm80VawY25";

export function loadGhlRuntimeConfig(env: NodeJS.ProcessEnv = process.env): GhlRuntimeConfig {
  const locationId = env.GHL_LOCATION_ID?.trim() || MOONROCK_GHL_LOCATION_ID;
  const privateIntegrationToken = env.GHL_PRIVATE_INTEGRATION_TOKEN?.trim() ?? "";
  const baseUrl = (env.GHL_BASE_URL?.trim() || "https://services.leadconnectorhq.com").replace(/\/$/, "");
  if (!locationId) throw new Error("GHL_LOCATION_ID is required");
  if (!privateIntegrationToken) throw new Error("GHL_PRIVATE_INTEGRATION_TOKEN must be provided through secret environment configuration");
  return { locationId, privateIntegrationToken, baseUrl };
}

export function redactedGhlRuntimeConfig(config: GhlRuntimeConfig) {
  return {
    locationId: config.locationId,
    baseUrl: config.baseUrl,
    privateIntegrationToken: "[REDACTED]" as const,
  };
}
