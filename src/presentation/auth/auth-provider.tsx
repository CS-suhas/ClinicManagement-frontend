"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useService } from "@/di/container-provider";
import type { CurrentUser } from "@/domain/auth";

interface AuthState {
  user: CurrentUser | null;
  /** True until the first session check finishes. */
  loading: boolean;
  signIn: (personaId?: string) => Promise<CurrentUser>;
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

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setUser(await authService.getCurrentUser());
    } catch {
      // A failed session check is treated as signed out, so the user can sign in again.
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [authService]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      signIn: async (personaId) => {
        const signedIn = await authService.signIn(personaId);
        setUser(signedIn);
        return signedIn;
      },
      signOut: async () => {
        await authService.signOut();
        setUser(null);
      },
      refresh,
    }),
    [user, loading, authService, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
