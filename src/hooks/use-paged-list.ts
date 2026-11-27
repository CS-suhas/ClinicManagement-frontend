"use client";

import {
  keepPreviousData,
  type QueryKey,
  type UseQueryOptions,
  useQuery,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { getErrorMessage } from "@/lib/errors";
import { usePagedSearch } from "./use-paged-search";

export const PAGE_SIZE = 20;

export type PageParams = { search?: string; page: number; pageSize: number };
export type Page<T> = { items: T[]; totalCount: number };

export const pageQuery = ({ search, page, pageSize }: PageParams) => ({
  Search: search,
  Page: page,
  PageSize: pageSize,
});

export function usePagedList<
  TData extends Page<unknown>,
  TError,
  TKey extends QueryKey,
>(
  options: (params: PageParams) => UseQueryOptions<TData, TError, TData, TKey>,
) {
  const { query, search, page, setQuery, setPage } = usePagedSearch();
  const result = useQuery({
    ...options({ search: search || undefined, page, pageSize: PAGE_SIZE }),
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
    rows: (data?.items ?? []) as TData["items"],
    loading: result.isLoading,
    error: result.error ? getErrorMessage(result.error) : null,
    reload: () => void result.refetch(),
  };
}
