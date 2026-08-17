import { assertFrontendConfig, config } from "./config.js";
import type { BusinessPath, DiscoveryResponse } from "./types.js";

async function post<T>(path: string, body: unknown): Promise<T> {
  assertFrontendConfig();
  const response = await fetch(`${config.novaApiBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(payload.detail ?? payload.title ?? `Nova request failed (${response.status})`);
  }
  return payload as T;
}

export function startDiscovery(sessionId: string, path: BusinessPath): Promise<DiscoveryResponse> {
  return post(`/v1/discovery/${encodeURIComponent(sessionId)}/start`, { path });
}

export function answerDiscovery(
  sessionId: string,
  field: string,
  value: string | number | boolean,
): Promise<DiscoveryResponse> {
  return post(`/v1/discovery/${encodeURIComponent(sessionId)}/answers`, { field, value });
}
