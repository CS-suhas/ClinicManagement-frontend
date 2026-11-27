export const BROWSER_API_BASE_URL = "/api";

export const DEFAULT_INTERNAL_API_URL = "http://localhost:8080/api";

export function resolveApiBaseUrl(): string {
  if (typeof window !== "undefined") return BROWSER_API_BASE_URL;
  return process.env.API_INTERNAL_URL || DEFAULT_INTERNAL_API_URL;
}
