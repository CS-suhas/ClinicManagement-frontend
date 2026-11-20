"use client";

import { useEffect, useState } from "react";

/**
 * Current time in ms, read only after mount (never during prerender, which
 * cacheComponents forbids) and refreshed every minute. `null` until mounted.
 */
export function useNow(refreshMs = 60_000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), refreshMs);
    return () => clearInterval(t);
  }, [refreshMs]);
  return now;
}
