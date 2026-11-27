export const OIDC_CALLBACK_PATH = "/login/callback";

export const OIDC_POST_LOGOUT_PATH = "/";

export const DEFAULT_KEYCLOAK_REALM = "clinic";
export const DEFAULT_KEYCLOAK_CLIENT_ID = "clinic-spa";

export type OidcRuntimeConfig = {
  url: string | null;
  realm: string;
  clientId: string;
};

export type OidcClientSettings = {
  authority: string;
  clientId: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
};

type Env = Record<string, string | undefined>;

const trimmed = (value: string | undefined) => value?.trim() || undefined;

export function oidcRuntimeConfigFromEnv(env: Env): OidcRuntimeConfig {
  return {
    url: trimmed(env.KEYCLOAK_URL)?.replace(/\/+$/, "") ?? null,
    realm: trimmed(env.KEYCLOAK_REALM) ?? DEFAULT_KEYCLOAK_REALM,
    clientId: trimmed(env.KEYCLOAK_CLIENT_ID) ?? DEFAULT_KEYCLOAK_CLIENT_ID,
  };
}

const stringOr = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

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
