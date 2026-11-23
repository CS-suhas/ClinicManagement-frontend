import type { PublicAccess } from "@/domain/auth";
import {
  type OidcRuntimeConfig,
  oidcRuntimeConfigFromEnv,
} from "@/infrastructure/oidc/oidc-config";

/**
 * Where the browser reads per-deployment settings. Served by this app (see
 * src/app/runtime-config/route.ts) from the environment at request time, so
 * nothing host-specific is baked into the build. Must not start with /auth/ or
 * /api/, which the reverse proxy sends to Keycloak and the API.
 */
export const RUNTIME_CONFIG_PATH = "/runtime-config";

/** What GET /runtime-config returns. */
export interface RuntimeConfig {
  keycloak: OidcRuntimeConfig;
  publicAccess: PublicAccess;
}

type Env = Record<string, string | undefined>;

/** "true"/"1"/"yes"/"on" and "false"/"0"/"no"/"off", case-insensitive; anything else is the fallback. */
export function parseBooleanSetting(
  value: string | undefined,
  fallback: boolean,
): boolean {
  const normalized = value?.trim().toLowerCase();
  if (normalized && ["true", "1", "yes", "on"].includes(normalized))
    return true;
  if (normalized && ["false", "0", "no", "off"].includes(normalized))
    return false;
  return fallback;
}

/** Server side: the config from the process environment. */
export function runtimeConfigFromEnv(env: Env): RuntimeConfig {
  return {
    keycloak: oidcRuntimeConfigFromEnv(env),
    publicAccess: {
      doctors: parseBooleanSetting(env.PUBLIC_DOCTORS, true),
    },
  };
}

/** Used when the config cannot be read: same-origin Keycloak defaults, doctors public. */
const FALLBACK_PUBLIC_ACCESS: PublicAccess = { doctors: true };

/**
 * Browser side: fetches GET /runtime-config once per page load. A failed fetch
 * is not cached, so the next call tries again.
 */
export class RuntimeConfigClient {
  private pending: Promise<Partial<RuntimeConfig>> | null = null;

  constructor(private readonly path: string = RUNTIME_CONFIG_PATH) {}

  load(): Promise<Partial<RuntimeConfig>> {
    if (!this.pending) {
      this.pending = fetch(this.path, { cache: "no-store" }).then(
        async (response) => {
          if (!response.ok)
            throw new Error(
              `Could not load the app settings (HTTP ${response.status}).`,
            );
          const body: unknown = await response.json();
          return body && typeof body === "object"
            ? (body as Partial<RuntimeConfig>)
            : {};
        },
      );
      this.pending.catch(() => {
        this.pending = null;
      });
    }
    return this.pending;
  }

  /** The keycloak section, unvalidated (see resolveOidcClientSettings). */
  async keycloak(): Promise<unknown> {
    return (await this.load()).keycloak;
  }

  /** What anonymous visitors may open. Falls back to the defaults when the config is unavailable. */
  async publicAccess(): Promise<PublicAccess> {
    if (typeof window === "undefined") return FALLBACK_PUBLIC_ACCESS;
    try {
      const doctors = (await this.load()).publicAccess?.doctors;
      return {
        doctors:
          typeof doctors === "boolean"
            ? doctors
            : FALLBACK_PUBLIC_ACCESS.doctors,
      };
    } catch {
      return FALLBACK_PUBLIC_ACCESS;
    }
  }
}
