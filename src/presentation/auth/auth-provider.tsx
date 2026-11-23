"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useService } from "@/di/container-provider";
import type { CurrentUser, SignInOptions } from "@/domain/auth";

interface AuthState {
  user: CurrentUser | null;
  /** True until the first session check finishes. */
  loading: boolean;
  /**
   * Mock personas sign in on the spot. The Keycloak flow redirects away and the
   * promise never settles; the user returns through `completeSignIn`.
   */
  signIn: (personaId?: string, options?: SignInOptions) => Promise<CurrentUser>;
  /** Finishes a redirect sign-in (the /login/callback page) and loads the user. */
  completeSignIn: () => Promise<{
    user: CurrentUser | null;
    returnTo: string | null;
  }>;
  signOut: () => Promise<void>;
  /** Re-reads the session, e.g. after the server-side session changes. */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/** Holds the current user for the whole app. Must sit inside <ContainerProvider>. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const authService = useService("authService");
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  // Only the latest session read may set the user: the mount-time check must
  // not overwrite the user that the sign-in callback has just loaded.
  const latestRead = useRef(0);

  const readUser = useCallback(async () => {
    const read = ++latestRead.current;
    let next: CurrentUser | null;
    try {
      next = await authService.getCurrentUser();
    } catch {
      // A failed session check is treated as signed out, so the user can sign in again.
      next = null;
    }
    if (read === latestRead.current) {
      setUser(next);
      setLoading(false);
    }
    return next;
  }, [authService]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await readUser();
  }, [readUser]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // A session that can no longer be refreshed signs the user out; the shell
  // then sends them to sign-in.
  useEffect(
    () =>
      authService.onSessionExpired(() => {
        latestRead.current++;
        setUser(null);
      }),
    [authService],
  );

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      signIn: async (personaId, options) => {
        const signedIn = await authService.signIn(personaId, options);
        latestRead.current++;
        setUser(signedIn);
        return signedIn;
      },
      completeSignIn: async () => {
        const { returnTo } = await authService.completeSignIn();
        return { user: await readUser(), returnTo };
      },
      signOut: async () => {
        await authService.signOut();
        latestRead.current++;
        setUser(null);
      },
      refresh,
    }),
    [user, loading, authService, refresh, readUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
