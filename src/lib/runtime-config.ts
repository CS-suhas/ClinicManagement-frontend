import {
  type OidcRuntimeConfig,
  oidcRuntimeConfigFromEnv,
} from "@/lib/auth/oidc-config";

export const RUNTIME_CONFIG_PATH = "/runtime-config";

export type PublicAccess = {
  doctors: boolean;
};

export type RuntimeConfig = {
  keycloak: OidcRuntimeConfig;
  publicAccess: PublicAccess;
};

type Env = Record<string, string | undefined>;

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

export function runtimeConfigFromEnv(env: Env): RuntimeConfig {
  return {
    keycloak: oidcRuntimeConfigFromEnv(env),
    publicAccess: {
      doctors: parseBooleanSetting(env.PUBLIC_DOCTORS, true),
    },
  };
}

const FALLBACK_PUBLIC_ACCESS: PublicAccess = { doctors: true };

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

  async keycloak(): Promise<unknown> {
    return (await this.load()).keycloak;
  }

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

export const runtimeConfig = new RuntimeConfigClient();
