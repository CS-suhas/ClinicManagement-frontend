"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "../lib/errors";

export interface AsyncData<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  /** Reloads with the loading state shown (and any error cleared). */
  reload: () => Promise<void>;
  /** Reloads quietly: no loading state, and a failure keeps the current data. */
  refresh: () => Promise<void>;
  /**
   * Edits the loaded data in place, e.g. for optimistic updates. Responses of
   * requests already in flight are dropped so they cannot overwrite the edit.
   */
  mutate: (update: (current: T | undefined) => T | undefined) => void;
}

/**
 * Loads data from a use-case on mount and exposes `reload()` for after mutations.
 * The loader may change identity between renders; the latest one is always used.
 */
export function useAsyncData<T>(
  loader: () => Promise<T>,
  dependencyKey?: string,
): AsyncData<T> {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Only the most recent request may update state (prevents stale overwrites).
  const requestId = useRef(0);

  const load = useCallback(async (silent: boolean) => {
    const id = ++requestId.current;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await loaderRef.current();
      if (id === requestId.current) setData(result);
    } catch (e) {
      if (id === requestId.current && !silent) setError(getErrorMessage(e));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  const reload = useCallback(() => load(false), [load]);
  const refresh = useCallback(() => load(true), [load]);

  const mutate = useCallback(
    (update: (current: T | undefined) => T | undefined) => {
      requestId.current++;
      setLoading(false);
      setData(update);
    },
    [],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: the key intentionally reloads query-driven data.
  useEffect(() => {
    void reload();
  }, [dependencyKey, reload]);

  return { data, loading, error, reload, refresh, mutate };
}
