/** Where Keycloak sends the browser back after sign-in. Registered in the realm. */
export const OIDC_CALLBACK_PATH = "/login/callback";

/** Where Keycloak sends the browser after sign-out. Registered in the realm. */
export const OIDC_POST_LOGOUT_PATH = "/";

export const DEFAULT_KEYCLOAK_REALM = "clinic";
export const DEFAULT_KEYCLOAK_CLIENT_ID = "clinic-spa";

/** The `keycloak` section of GET /runtime-config. */
export interface OidcRuntimeConfig {
  /** Keycloak base URL including its relative path, e.g. `http://localhost:8081/auth`. Null means `<origin>/auth`. */
  url: string | null;
  realm: string;
  clientId: string;
}

/** Settings the OIDC client needs, after defaults are applied in the browser. */
export interface OidcClientSettings {
  /** The realm issuer, e.g. `http://40.83.74.64/auth/realms/clinic`. */
  authority: string;
  clientId: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
}

type Env = Record<string, string | undefined>;

const trimmed = (value: string | undefined) => value?.trim() || undefined;

/** Server side: the runtime config from KEYCLOAK_URL, KEYCLOAK_REALM and KEYCLOAK_CLIENT_ID. */
export function oidcRuntimeConfigFromEnv(env: Env): OidcRuntimeConfig {
  return {
    url: trimmed(env.KEYCLOAK_URL)?.replace(/\/+$/, "") ?? null,
    realm: trimmed(env.KEYCLOAK_REALM) ?? DEFAULT_KEYCLOAK_REALM,
    clientId: trimmed(env.KEYCLOAK_CLIENT_ID) ?? DEFAULT_KEYCLOAK_CLIENT_ID,
  };
}

const stringOr = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

/**
 * Browser side: turns the served config into client settings. Missing values
 * fall back to the same-origin defaults (`<origin>/auth`, realm `clinic`,
 * client `clinic-spa`), which is what the reverse-proxied deployment uses.
 */
export function resolveOidcClientSettings(
  config: unknown,
  origin: string,
): OidcClientSettings {
  const raw = (config && typeof config === "object" ? config : {}) as Record<
    string,
    unknown
  >;
  const baseUrl = stringOr(raw.url, `${origin}/auth`).replace(/\/+$/, "");
  const realm = stringOr(raw.realm, DEFAULT_KEYCLOAK_REALM);
  return {
    authority: `${baseUrl}/realms/${encodeURIComponent(realm)}`,
    clientId: stringOr(raw.clientId, DEFAULT_KEYCLOAK_CLIENT_ID),
    redirectUri: `${origin}${OIDC_CALLBACK_PATH}`,
    postLogoutRedirectUri: `${origin}${OIDC_POST_LOGOUT_PATH}`,
  };
}
