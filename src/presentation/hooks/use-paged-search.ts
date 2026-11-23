"use client";

import { useCallback, useEffect, useState } from "react";

export function usePagedSearch(delay = 300) {
  const [query, setQuery] = useState("");
  const [criteria, setCriteria] = useState({ search: "", page: 1 });

  useEffect(() => {
    const timer = window.setTimeout(
      () => setCriteria({ search: query.trim(), page: 1 }),
      delay,
    );
    return () => window.clearTimeout(timer);
  }, [delay, query]);

  const setQueryNow = useCallback((value: string) => {
    setQuery(value);
    setCriteria({ search: value.trim(), page: 1 });
  }, []);
  const setPage = useCallback(
    (page: number) => setCriteria((current) => ({ ...current, page })),
    [],
  );
  const resetPage = useCallback(
    () => setCriteria((current) => ({ ...current, page: 1 })),
    [],
  );

  return {
    query,
    search: criteria.search,
    page: criteria.page,
    setQuery,
    setQueryNow,
    setPage,
    resetPage,
  };
}
