import { useQuery } from "@tanstack/react-query";
import { ApiError, api, unwrap } from "@/lib/api";
import { session } from "@/lib/auth/session";
import { runtimeConfig } from "@/lib/runtime-config";
import { type CurrentUser, Role } from "./schemas";

export const ME_KEY = ["me"];

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!(await session.hasSession())) return null;
  try {
    const me = await unwrap(api.GET("/api/me"));
    const subject = me.subject ?? "";
    return {
      ...me,
      subject,
      roles: me.roles.filter((role) => Role.safeParse(role).success) as Role[],
      displayName: me.displayName ?? subject,
      clinicAdminOf: me.clinicAdminOf ?? [],
    };
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      await session.clear();
      return null;
    }
    throw e;
  }
}

export function usePublicAccess() {
  return useQuery({
    queryKey: ["public-access"],
    queryFn: () => runtimeConfig.publicAccess(),
    staleTime: Number.POSITIVE_INFINITY,
  }).data;
}
