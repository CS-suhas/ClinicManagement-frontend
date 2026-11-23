/** Where the browser reaches the API: same origin, routed by the reverse proxy (or by the dev rewrite in next.config.ts). */
export const BROWSER_API_BASE_URL = "/api";

/** Fallback for server-side code when API_INTERNAL_URL is unset, e.g. `npm run dev` against a local API. */
export const DEFAULT_INTERNAL_API_URL = "http://localhost:8080/api";

/**
 * The API base URL for the code that is running right now. Call it per request,
 * never at module load: on the server it reads `API_INTERNAL_URL` from the
 * runtime environment (not a NEXT_PUBLIC_* value, so it is never inlined at
 * build time), which lets one image run on any host.
 */
export function resolveApiBaseUrl(): string {
  if (typeof window !== "undefined") return BROWSER_API_BASE_URL;
  return process.env.API_INTERNAL_URL || DEFAULT_INTERNAL_API_URL;
}
