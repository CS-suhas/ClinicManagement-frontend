"use client";

import { useDashboard } from "@/features/dashboard/api";

export function useMyDashboard(userKey: string | null) {
  const { data, refetch } = useDashboard(userKey !== null);
  return {
    data: userKey === null ? null : (data ?? null),
    reload: () => void refetch(),
  };
}
