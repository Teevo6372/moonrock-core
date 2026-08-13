export interface HighLevelInspectorConfig {
  locationId: string;
  accessToken: string;
  baseUrl?: string;
}

export interface HighLevelCustomField {
  id: string;
  name: string;
  fieldKey: string;
  dataType?: string;
  model?: "contact" | "opportunity" | string;
}

export interface HighLevelPipelineStage {
  id: string;
  name: string;
  position?: number;
}

export interface HighLevelPipeline {
  id: string;
  name: string;
  stages: HighLevelPipelineStage[];
}

export interface HighLevelLocationInspection {
  locationId: string;
  location: Record<string, unknown>;
  customFields: HighLevelCustomField[];
  pipelines: HighLevelPipeline[];
  inspectedAt: string;
}

export const HIGHLEVEL_INSPECTOR_SCOPES = [
  "locations.readonly",
  "locations/customFields.readonly",
  "opportunities/pipelines.readonly",
] as const;

export class HighLevelInspectionError extends Error {
  constructor(
    readonly endpoint: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HighLevelInspectionError";
  }
}

export async function inspectHighLevelLocation(
  config: HighLevelInspectorConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<HighLevelLocationInspection> {
  if (!config.locationId.trim()) throw new Error("HighLevel location ID is required");
  if (!config.accessToken.trim()) throw new Error("HighLevel access token is required");

  const baseUrl = (config.baseUrl ?? "https://services.leadconnectorhq.com").replace(/\/$/, "");
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${config.accessToken}`,
    Version: "v3",
  };

  const [location, customFieldPayload, pipelinePayload] = await Promise.all([
    getJson<Record<string, unknown>>(
      fetchImpl,
      `${baseUrl}/locations/${encodeURIComponent(config.locationId)}`,
      headers,
    ),
    getJson<{ customFields?: HighLevelCustomField[] }>(
      fetchImpl,
      `${baseUrl}/locations/${encodeURIComponent(config.locationId)}/customFields?model=all`,
      headers,
    ),
    getJson<{ pipelines?: HighLevelPipeline[] }>(
      fetchImpl,
      `${baseUrl}/opportunities/pipelines?locationId=${encodeURIComponent(config.locationId)}`,
      headers,
    ),
  ]);

  return {
    locationId: config.locationId,
    location,
    customFields: Array.isArray(customFieldPayload.customFields) ? customFieldPayload.customFields : [],
    pipelines: Array.isArray(pipelinePayload.pipelines) ? pipelinePayload.pipelines : [],
    inspectedAt: new Date().toISOString(),
  };
}

async function getJson<T>(
  fetchImpl: typeof fetch,
  url: string,
  headers: Record<string, string>,
): Promise<T> {
  const response = await fetchImpl(url, { method: "GET", headers });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new HighLevelInspectionError(
      new URL(url).pathname,
      response.status,
      text || `HighLevel request failed with status ${response.status}`,
    );
  }
  return await response.json() as T;
}
