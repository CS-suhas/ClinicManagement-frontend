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

/** Web Locks name that serialises token refreshes across this origin's tabs. */
const REFRESH_LOCK = "oidc-token-refresh";

const isExpiring = (user: User) =>
  user.expires_in !== undefined && user.expires_in <= REFRESH_MARGIN_SECONDS;

/**
 * Runs `fn` while holding the cross-tab refresh lock. Web Locks need a secure
 * context; elsewhere (the app over plain HTTP) `fn` runs unlocked.
 */
function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  return locks ? (locks.request(REFRESH_LOCK, fn) as Promise<T>) : fn();
}

/** Carried through Keycloak in the OIDC `state`, so the callback knows where to go. */
interface SignInState {
  returnTo?: string;
}

const isBrowser = () => typeof window !== "undefined";

/**
 * The browser's Keycloak session: Authorization Code flow with PKCE (S256)
 * against a public client, via oidc-client-ts. Tokens live in localStorage, so
 * every tab of the app shares one sign-in, and are refreshed on demand with the
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
  private watchingOtherTabs = false;

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
      // Shared by all tabs; see refresh() for how they take turns refreshing.
      userStore: new WebStorageStateStore({ store: window.localStorage }),
      // Tokens are refreshed when a request needs one (see getAccessToken), so
      // an idle tab does not keep the Keycloak session alive forever.
      automaticSilentRenew: false,
      monitorSession: false,
      loadUserInfo: false,
    };
    const manager = new UserManager(settings);
    this.watchOtherTabs(settings);
    return { manager, settings };
  }

  /** Signing out in another tab removes the shared tokens; this tab then signs out too. */
  private watchOtherTabs(settings: UserManagerSettings) {
    if (this.watchingOtherTabs) return;
    this.watchingOtherTabs = true;
    // oidc-client-ts's user key; the store prefix is "oidc.".
    const key = `oidc.user:${settings.authority}:${settings.client_id}`;
    window.addEventListener("storage", (event) => {
      if (event.storageArea !== window.localStorage) return;
      if ((event.key === key && event.newValue === null) || event.key === null)
        this.notifyExpired();
    });
  }

  private notifyExpired() {
    for (const listener of this.expiredListeners) listener();
  }

  /** A valid access token, refreshed first when it is about to expire. Null when signed out. */
  async getAccessToken(): Promise<string | null> {
    if (!isBrowser()) return null;
    const manager = await this.manager();
    const user = await manager.getUser();
    if (!user) return null;
    if (!isExpiring(user)) return user.access_token;
    return (await this.refresh(manager))?.access_token ?? null;
  }

  /** True when there is a usable (or refreshable) session in this tab. */
  async hasSession(): Promise<boolean> {
    return (await this.getAccessToken()) !== null;
  }

  /**
   * One refresh at a time, across all tabs: the realm rotates refresh tokens,
   * so two parallel refreshes would revoke each other. Inside the lock the
   * stored tokens are read again, since another tab may have just refreshed
   * them. A failed refresh ends the session (in every tab).
   */
  private refresh(manager: UserManager): Promise<User | null> {
    if (!this.refreshing) {
      this.refreshing = withRefreshLock(() => this.refreshNow(manager)).finally(
        () => {
          this.refreshing = null;
        },
      );
    }
    return this.refreshing;
  }

  private async refreshNow(manager: UserManager): Promise<User | null> {
    const before = await manager.getUser();
    if (!before) return null;
    if (!isExpiring(before)) return before;
    try {
      return await manager.signinSilent();
    } catch {
      // Without Web Locks (plain-HTTP origins) another tab may have refreshed
      // first, revoking the token used here; its new tokens are still good.
      const after = await manager.getUser();
      if (after && after.refresh_token !== before.refresh_token) return after;
      await manager.removeUser();
      this.notifyExpired();
      return null;
    }
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
