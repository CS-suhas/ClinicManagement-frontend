"use client";

import { useEffect } from "react";
import { useDashboard } from "@/features/dashboard/api";

export const COUNTS_CHANGED_EVENT = "medipulse:counts-changed";

export function announceCountsChanged(): void {
  window.dispatchEvent(new Event(COUNTS_CHANGED_EVENT));
}

export function useMyDashboard(userKey: string | null) {
  const { data, refetch } = useDashboard(userKey !== null);

  useEffect(() => {
    if (userKey === null) return;
    const onCountsChanged = () => void refetch();
    window.addEventListener(COUNTS_CHANGED_EVENT, onCountsChanged);
    return () =>
      window.removeEventListener(COUNTS_CHANGED_EVENT, onCountsChanged);
  }, [userKey, refetch]);

  return {
    data: userKey === null ? null : (data ?? null),
    reload: () => void refetch(),
  };
}
