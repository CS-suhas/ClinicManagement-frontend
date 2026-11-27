"use client";

import { useEffect, useState } from "react";

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
