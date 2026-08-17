const rawBaseUrl = import.meta.env.VITE_NOVA_API_BASE_URL as string | undefined;

export const config = {
  novaApiBaseUrl: rawBaseUrl?.replace(/\/$/, "") ?? "",
} as const;

export function assertFrontendConfig(): void {
  if (!config.novaApiBaseUrl) {
    throw new Error("VITE_NOVA_API_BASE_URL is required before the Moonrock 2.0 frontend can call Nova.");
  }
}
