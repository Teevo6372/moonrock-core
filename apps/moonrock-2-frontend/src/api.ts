import { assertFrontendConfig, config } from "./config.js";
import type { BusinessPath, ContactIdentity, DiscoveryResponse } from "./types.js";

async function post<T>(path: string, body: unknown): Promise<T> {
  assertFrontendConfig();
  const response = await fetch(`${config.novaApiBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let payload: Record<string, unknown> = {};
  try { payload = text ? JSON.parse(text) as Record<string, unknown> : {}; } catch { payload = {}; }
  if (!response.ok) {
    const detail = typeof payload.detail === "string" ? payload.detail : undefined;
    const title = typeof payload.title === "string" ? payload.title : undefined;
    throw new Error(detail ?? title ?? `Nova request failed (${response.status})`);
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
  identity?: ContactIdentity,
): Promise<DiscoveryResponse> {
  return post(`/v1/discovery/${encodeURIComponent(sessionId)}/answers`, {
    field,
    value,
    ...(identity ? { identity } : {}),
  });
}
