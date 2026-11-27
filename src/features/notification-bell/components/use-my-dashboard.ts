"use client";

import { useCallback, useEffect, useState } from "react";
import { useService } from "@/di/container-provider";
import type { MeDashboard } from "@/domain/repositories";

/** How often the dashboard counts refresh while the tab is visible. */
export const MY_DASHBOARD_POLL_MS = 60_000;

/** Window event: an action changed a count, so badges and the bell should re-read it. */
export const COUNTS_CHANGED_EVENT = "medipulse:counts-changed";

/** Call after approving, rejecting or verifying, so the nav badges update at once. */
export function announceCountsChanged(): void {
  window.dispatchEvent(new Event(COUNTS_CHANGED_EVENT));
}

/**
 * The signed-in user's dashboard counts, shared by the nav badges and the bell.
 * Loads once per user, then every 60 s while the tab is visible and again when
 * it becomes visible or an action announces a change.
 */
export function useMyDashboard(userKey: string | null) {
  const dashboardService = useService("dashboardService");
  const [data, setData] = useState<MeDashboard | null>(null);

  const reload = useCallback(async () => {
    try {
      setData(await dashboardService.getMine());
    } catch {
      // Keep the last counts; a failed poll should not disturb the page.
    }
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
