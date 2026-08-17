import { describe, expect, it } from "vitest";
import { corsHeaders, isOriginAllowed, NOVA_LOCAL_ORIGINS, parseAllowedOrigins } from "../src/cors-policy.js";

describe("Nova browser origin policy", () => {
  it("keeps local development origins and adds configured exact origins", () => {
    const origins = parseAllowedOrigins("https://moonrock-2.pages.dev, https://moonrockmarketing.com");
    expect(origins).toEqual(expect.arrayContaining([...NOVA_LOCAL_ORIGINS, "https://moonrock-2.pages.dev", "https://moonrockmarketing.com"]));
  });

  it("deduplicates configured origins", () => {
    const origins = parseAllowedOrigins("https://moonrock-2.pages.dev,https://moonrock-2.pages.dev");
    expect(origins.filter((origin) => origin === "https://moonrock-2.pages.dev")).toHaveLength(1);
  });

  it.each(["*", "moonrock-2.pages.dev", "https://moonrock-2.pages.dev/path", "https://moonrock-2.pages.dev/", "ftp://moonrock-2.pages.dev"])("rejects invalid or non-origin values: %s", (value) => {
    expect(() => parseAllowedOrigins(value)).toThrow(/NOVA_ALLOWED_ORIGINS contains an invalid origin/);
  });

  it("allows only exact configured origins", () => {
    const origins = parseAllowedOrigins("https://moonrock-2.pages.dev");
    expect(isOriginAllowed("https://moonrock-2.pages.dev", origins)).toBe(true);
    expect(isOriginAllowed("https://evil.example", origins)).toBe(false);
    expect(isOriginAllowed(null, origins)).toBe(false);
  });

  it("emits restrictive browser preflight headers", () => {
    expect(corsHeaders("https://moonrock-2.pages.dev")).toEqual({
      "access-control-allow-origin": "https://moonrock-2.pages.dev",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type,x-correlation-id,last-event-id",
      "access-control-max-age": "600",
      vary: "Origin",
    });
  });
});
