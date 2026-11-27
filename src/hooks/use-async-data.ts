"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "@/lib/errors";

export type AsyncData<T> = {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  refresh: () => Promise<void>;
  mutate: (update: (current: T | undefined) => T | undefined) => void;
};

export function useAsyncData<T>(
  loader: () => Promise<T>,
  dependencyKey?: string,
): AsyncData<T> {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
