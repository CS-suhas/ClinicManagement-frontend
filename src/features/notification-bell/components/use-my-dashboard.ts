"use client";

import { useCallback, useEffect, useState } from "react";
import { useService } from "@/di/container-provider";
import type { MeDashboard } from "@/domain/repositories";

export const MY_DASHBOARD_POLL_MS = 60_000;

export const COUNTS_CHANGED_EVENT = "medipulse:counts-changed";

export function announceCountsChanged(): void {
  window.dispatchEvent(new Event(COUNTS_CHANGED_EVENT));
}

export function useMyDashboard(userKey: string | null) {
  const dashboardService = useService("dashboardService");
  const [data, setData] = useState<MeDashboard | null>(null);

  const reload = useCallback(async () => {
    try {
      setData(await dashboardService.getMine());
    } catch {}
  }, [dashboardService]);

  useEffect(() => {
    if (userKey === null) {
      setData(null);
      return;
    }
    void reload();
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void reload();
    };
    const timer = window.setInterval(refreshIfVisible, MY_DASHBOARD_POLL_MS);
    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener(COUNTS_CHANGED_EVENT, reload);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener(COUNTS_CHANGED_EVENT, reload);
    };
  }, [userKey, reload]);

  return { data, reload };
}
