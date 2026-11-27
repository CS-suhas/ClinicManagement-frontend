"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getErrorMessage } from "@/lib/errors";
import { usePagedSearch } from "./use-paged-search";

export const PAGE_SIZE = 20;

export type PageParams = { search?: string; page: number; pageSize: number };
export type Page<T> = { items: T[]; totalCount: number };

export function usePagedList<T>(
  key: unknown[],
  fetchPage: (params: PageParams) => Promise<Page<T>>,
) {
  const { query, search, page, setQuery, setPage } = usePagedSearch();
  const result = useQuery({
    queryKey: [...key, { search, page }],
    queryFn: () =>
      fetchPage({ search: search || undefined, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
  const data = result.data;

  useEffect(() => {
    if (data && data.items.length === 0 && data.totalCount > 0 && page > 1)
      setPage(page - 1);
  }, [data, page, setPage]);

  return {
    query,
    setQuery,
    page,
    setPage,
    data,
    rows: data?.items ?? [],
    loading: result.isPending,
    error: result.error ? getErrorMessage(result.error) : null,
    reload: () => void result.refetch(),
  };
}
