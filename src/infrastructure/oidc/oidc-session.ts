import {
  type User,
  UserManager,
  type UserManagerSettings,
  WebStorageStateStore,
} from "oidc-client-ts";
import { ensureCryptoInInsecureContext } from "./insecure-context-crypto";
import { resolveOidcClientSettings } from "./oidc-config";

/** Access tokens this close to expiry are refreshed before use. */
const REFRESH_MARGIN_SECONDS = 30;

/** Carried through Keycloak in the OIDC `state`, so the callback knows where to go. */
interface SignInState {
  returnTo?: string;
}

const isBrowser = () => typeof window !== "undefined";

/**
 * The browser's Keycloak session: Authorization Code flow with PKCE (S256)
 * against a public client, via oidc-client-ts. Tokens live in sessionStorage
 * (per tab, cleared when the tab closes) and are refreshed on demand with the
 * refresh token. On the server every method behaves as "signed out".
 */
export class OidcSession {
  private managerPromise: Promise<{
    manager: UserManager;
    settings: UserManagerSettings;
  }> | null = null;
  private refreshing: Promise<User | null> | null = null;
  private callback: Promise<{ returnTo: string | null }> | null = null;
  private readonly expiredListeners = new Set<() => void>();

  /** `loadConfig` supplies the runtime Keycloak settings (the `keycloak` section of /runtime-config). */
  constructor(private readonly loadConfig: () => Promise<unknown>) {}

  /** The UserManager, built once from the runtime config. A failed load is retried next time. */
  private async manager(): Promise<UserManager> {
    return (await this.managerAndSettings()).manager;
  }

  private managerAndSettings() {
    if (!this.managerPromise) {
      this.managerPromise = this.createManager();
      this.managerPromise.catch(() => {
        this.managerPromise = null;
      });
    }
    return this.managerPromise;
  }

  private async createManager() {
    ensureCryptoInInsecureContext();
    const client = resolveOidcClientSettings(
      await this.loadConfig(),
      window.location.origin,
    );
    const settings: UserManagerSettings = {
      authority: client.authority,
      client_id: client.clientId,
      redirect_uri: client.redirectUri,
      post_logout_redirect_uri: client.postLogoutRedirectUri,
      response_type: "code",
      scope: "openid profile email",
      userStore: new WebStorageStateStore({ store: window.sessionStorage }),
      // Tokens are refreshed when a request needs one (see getAccessToken), so
      // an idle tab does not keep the Keycloak session alive forever.
      automaticSilentRenew: false,
      monitorSession: false,
      loadUserInfo: false,
    };
    return { manager: new UserManager(settings), settings };
  }

  /** A valid access token, refreshed first when it is about to expire. Null when signed out. */
  async getAccessToken(): Promise<string | null> {
    if (!isBrowser()) return null;
    const manager = await this.manager();
    const user = await manager.getUser();
    if (!user) return null;
    const expiresIn = user.expires_in;
    if (expiresIn === undefined || expiresIn > REFRESH_MARGIN_SECONDS)
      return user.access_token;
    return (await this.refresh(manager))?.access_token ?? null;
  }

  /** True when there is a usable (or refreshable) session in this tab. */
  async hasSession(): Promise<boolean> {
    return (await this.getAccessToken()) !== null;
  }

  /**
   * One refresh at a time: the realm rotates refresh tokens, so two parallel
   * refreshes would revoke each other. A failed refresh ends the session.
   */
  private refresh(manager: UserManager): Promise<User | null> {
    if (!this.refreshing) {
      this.refreshing = manager
        .signinSilent()
        .catch(async () => {
          await manager.removeUser();
          for (const listener of this.expiredListeners) listener();
          return null;
        })
        .finally(() => {
          this.refreshing = null;
        });
    }
    return this.refreshing;
  }

  /** Sends the browser to Keycloak's sign-in (or registration) page. */
  async signIn(options: { returnTo?: string; register?: boolean } = {}) {
    const { manager, settings } = await this.managerAndSettings();
    const state: SignInState = { returnTo: options.returnTo };
    if (!options.register) {
      await manager.signinRedirect({ state });
      return;
    }
    // Keycloak 26.0 ignores OIDC `prompt=create`. Its registrations endpoint
    // (what keycloak-js uses) takes the same authorization request and opens
    // the sign-up form. The flow state is stored where the normal manager
    // finds it, so /login/callback finishes it as usual.
    const registration = new UserManager({
      ...settings,
      metadataSeed: {
        authorization_endpoint: `${settings.authority}/protocol/openid-connect/registrations`,
      },
    });
    await registration.signinRedirect({ state });
  }

  /**
   * Finishes the redirect on the callback page: checks the state, swaps the
   * code (plus PKCE verifier) for tokens and stores them. Runs once per page
   * load even if called twice (React strict mode re-runs effects).
   */
  completeSignIn(): Promise<{ returnTo: string | null }> {
    if (!this.callback)
      this.callback = this.manager().then(async (manager) => {
        const user = await manager.signinCallback();
        const state = (user?.state ?? {}) as SignInState;
        return { returnTo: state.returnTo ?? null };
      });
    return this.callback;
  }

  /** Clears the local session and ends the Keycloak session (RP-initiated logout). */
  async signOut(): Promise<void> {
    if (!isBrowser()) return;
    const manager = await this.manager();
    const user = await manager.getUser();
    if (!user) return;
    try {
      // id_token_hint lets Keycloak skip its "Do you want to log out?" page.
      await manager.signoutRedirect({ id_token_hint: user.id_token });
    } finally {
      await manager.removeUser();
    }
  }

  /** Forgets the local tokens without contacting Keycloak, e.g. after the API rejects them. */
  async clear(): Promise<void> {
    if (!isBrowser()) return;
    await (await this.manager()).removeUser();
  }

  /** Called when a refresh fails and the session is gone. Returns an unsubscribe function. */
  onSessionExpired(listener: () => void): () => void {
    this.expiredListeners.add(listener);
    return () => {
      this.expiredListeners.delete(listener);
    };
  }
}
