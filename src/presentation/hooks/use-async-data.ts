"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "../lib/errors";

export interface AsyncData<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Loads data from a use-case on mount and exposes `reload()` for after mutations.
 * The loader may change identity between renders; the latest one is always used.
 */
export function useAsyncData<T>(loader: () => Promise<T>): AsyncData<T> {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Only the most recent request may update state (prevents stale overwrites).
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await loaderRef.current();
      if (id === requestId.current) setData(result);
    } catch (e) {
      if (id === requestId.current) setError(getErrorMessage(e));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}
