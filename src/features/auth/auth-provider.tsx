"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect } from "react";
import { session } from "@/lib/auth/session";
import { getCurrentUser, ME_KEY } from "./api";
import type { CurrentUser, SignInOptions } from "./schemas";

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      session.onSessionExpired(() => queryClient.setQueryData(ME_KEY, null)),
    [queryClient],
  );
  return children;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data, isPending, refetch } = useQuery({
    queryKey: ME_KEY,
    queryFn: () => getCurrentUser().catch(() => null),
    staleTime: Number.POSITIVE_INFINITY,
  });

  return {
    user: data ?? null,
    loading: isPending,
    signIn: async (options?: SignInOptions) => {
      await session.signIn(options);
      return new Promise<never>(() => {});
    },
    completeSignIn: async (): Promise<{
      user: CurrentUser | null;
      returnTo: string | null;
    }> => {
      const { returnTo } = await session.completeSignIn();
      const user = await queryClient.fetchQuery({
        queryKey: ME_KEY,
        queryFn: getCurrentUser,
      });
      return { user, returnTo };
    },
    signOut: async () => {
      await session.signOut();
      queryClient.setQueryData(ME_KEY, null);
    },
    refresh: async () => {
      await refetch();
    },
  };
}
