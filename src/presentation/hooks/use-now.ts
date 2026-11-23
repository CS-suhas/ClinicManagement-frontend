"use client";

import { useEffect, useState } from "react";

/** The shared clock ticks every 30 s; each hook decides how often it re-renders. */
const TICK_MS = 30_000;

const subscribers = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void): () => void {
  subscribers.add(listener);
  timer ??= setInterval(() => {
    for (const notify of subscribers) notify();
  }, TICK_MS);
  return () => {
    subscribers.delete(listener);
    if (subscribers.size === 0 && timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/**
 * Current time in ms, read only after mount (never during prerender or the
 * first render) and refreshed about every `refreshMs` (granularity 30 s), with
 * one interval shared by all callers. `null` until mounted; render an absolute
 * fallback in that state so server and client markup match.
 */
export function useNow(refreshMs = 30_000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    let last = Date.now();
    setNow(last);
    return subscribe(() => {
      const current = Date.now();
      if (current - last >= refreshMs) {
        last = current;
        setNow(current);
      }
    });
  }, [refreshMs]);
  return now;
}
