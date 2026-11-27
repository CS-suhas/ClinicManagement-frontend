"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "@/lib/errors";

const TTL_MS = 60_000;

type Entry = {
  value?: unknown;
  hasValue: boolean;
  loadedAt: number;
  inflight?: Promise<unknown>;
};

const cache = new Map<string, Entry>();

const entryFor = (key: string): Entry => {
  let entry = cache.get(key);
  if (!entry) {
    entry = { hasValue: false, loadedAt: 0 };
    cache.set(key, entry);
  }
  return entry;
};

export function loadGlance<T>(
  key: string,
  fetcher: () => Promise<T>,
  force = false,
): Promise<T> {
  const entry = entryFor(key);
  if (entry.inflight) return entry.inflight as Promise<T>;
  if (!force && entry.hasValue && Date.now() - entry.loadedAt < TTL_MS)
    return Promise.resolve(entry.value as T);
  const request = fetcher().then(
    (value) => {
      entry.value = value;
      entry.hasValue = true;
      entry.loadedAt = Date.now();
      entry.inflight = undefined;
      return value;
    },
    (error: unknown) => {
      entry.inflight = undefined;
      throw error;
    },
  );
  entry.inflight = request;
  return request;
}

export function invalidateGlanceData(): void {
  for (const entry of cache.values()) entry.loadedAt = 0;
}

export type GlanceState<T> = {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  retry: () => void;
};

export function useGlanceData<T>(
  key: string,
  fetcher: () => Promise<T>,
  enabled = true,
): GlanceState<T> {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    key: string;
    data: T | undefined;
    error: string | null;
    loading: boolean;
  }>({ key, data: undefined, error: null, loading: false });

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const cached = cache.get(key);
    const stale = !cached?.hasValue || Date.now() - cached.loadedAt >= TTL_MS;
    setState({
      key,
      data: cached?.hasValue ? (cached.value as T) : undefined,
      error: null,
      loading: stale,
    });
    loadGlance(key, () => fetcherRef.current(), attempt > 0).then(
      (data) => {
        if (active) setState({ key, data, error: null, loading: false });
      },
      (e: unknown) => {
        if (active)
          setState((current) => ({
            key,
            data: current.key === key ? current.data : undefined,
            error: getErrorMessage(e),
            loading: false,
          }));
      },
    );
    return () => {
      active = false;
    };
  }, [key, enabled, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const current = state.key === key;
  return {
    data: current ? state.data : undefined,
    error: current ? state.error : null,
    loading: enabled && (!current || state.loading),
    retry,
  };
}
