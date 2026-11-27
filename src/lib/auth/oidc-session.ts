import {
  type User,
  UserManager,
  type UserManagerSettings,
  WebStorageStateStore,
} from "oidc-client-ts";
import { resolveOidcClientSettings } from "./oidc-config";

const REFRESH_MARGIN_SECONDS = 30;

const REFRESH_LOCK = "oidc-token-refresh";

const isExpiring = (user: User) =>
  user.expires_in !== undefined && user.expires_in <= REFRESH_MARGIN_SECONDS;

function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  return locks ? (locks.request(REFRESH_LOCK, fn) as Promise<T>) : fn();
}

type SignInState = {
  returnTo?: string;
};

const isBrowser = () => typeof window !== "undefined";

export class OidcSession {
  private managerPromise: Promise<{
    manager: UserManager;
    settings: UserManagerSettings;
  }> | null = null;
  private refreshing: Promise<User | null> | null = null;
  private callback: Promise<{ returnTo: string | null }> | null = null;
  private readonly expiredListeners = new Set<() => void>();
  private watchingOtherTabs = false;

  constructor(private readonly loadConfig: () => Promise<unknown>) {}

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
      userStore: new WebStorageStateStore({ store: window.localStorage }),
      automaticSilentRenew: false,
      monitorSession: false,
      loadUserInfo: false,
    };
    const manager = new UserManager(settings);
    this.watchOtherTabs(settings);
    return { manager, settings };
  }

  private watchOtherTabs(settings: UserManagerSettings) {
    if (this.watchingOtherTabs) return;
    this.watchingOtherTabs = true;
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

  async getAccessToken(): Promise<string | null> {
    if (!isBrowser()) return null;
    const manager = await this.manager();
    const user = await manager.getUser();
    if (!user) return null;
    if (!isExpiring(user)) return user.access_token;
    return (await this.refresh(manager))?.access_token ?? null;
  }

  async hasSession(): Promise<boolean> {
    return (await this.getAccessToken()) !== null;
  }

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
      const after = await manager.getUser();
      if (after && after.refresh_token !== before.refresh_token) return after;
      await manager.removeUser();
      this.notifyExpired();
      return null;
    }
  }

  async signIn(options: { returnTo?: string; register?: boolean } = {}) {
    const { manager, settings } = await this.managerAndSettings();
    const state: SignInState = { returnTo: options.returnTo };
    if (!options.register) {
      await manager.signinRedirect({ state });
      return;
    }
    const registration = new UserManager({
      ...settings,
      metadataSeed: {
        authorization_endpoint: `${settings.authority}/protocol/openid-connect/registrations`,
      },
    });
    await registration.signinRedirect({ state });
  }

  completeSignIn(): Promise<{ returnTo: string | null }> {
    if (!this.callback)
      this.callback = this.manager().then(async (manager) => {
        const user = await manager.signinCallback();
        const state = (user?.state ?? {}) as SignInState;
        return { returnTo: state.returnTo ?? null };
      });
    return this.callback;
  }

  async signOut(): Promise<void> {
    if (!isBrowser()) return;
    const manager = await this.manager();
    const user = await manager.getUser();
    if (!user) return;
    try {
      await manager.signoutRedirect({ id_token_hint: user.id_token });
    } finally {
      await manager.removeUser();
    }
  }

  async clear(): Promise<void> {
    if (!isBrowser()) return;
    await (await this.manager()).removeUser();
  }

  onSessionExpired(listener: () => void): () => void {
    this.expiredListeners.add(listener);
    return () => {
      this.expiredListeners.delete(listener);
    };
  }
}
