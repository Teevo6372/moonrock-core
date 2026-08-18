export const NOVA_LOCAL_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8787",
  "http://127.0.0.1:8787",
] as const;

export const MOONROCK_PAGES_ORIGINS = [
  "https://moonrock-2.pages.dev",
  "https://staging.moonrock-2.pages.dev",
] as const;

export function parseAllowedOrigins(raw: string | undefined): string[] {
  const configured = (raw ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);
  for (const origin of configured) {
    let parsed: URL;
    try { parsed = new URL(origin); } catch { throw new Error(`NOVA_ALLOWED_ORIGINS contains an invalid origin: ${origin}`); }
    if (parsed.origin !== origin || !["http:", "https:"].includes(parsed.protocol)) throw new Error(`NOVA_ALLOWED_ORIGINS contains an invalid origin: ${origin}`);
  }
  return [...new Set([...NOVA_LOCAL_ORIGINS, ...MOONROCK_PAGES_ORIGINS, ...configured])];
}

export function isOriginAllowed(origin: string | null, allowedOrigins: readonly string[]): origin is string {
  return origin !== null && allowedOrigins.includes(origin);
}

export function corsHeaders(origin: string): Record<string, string> {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,x-correlation-id,last-event-id",
    "access-control-max-age": "600",
    vary: "Origin",
  };
}
