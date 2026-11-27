"use client";

import type { PagedResult } from "@/domain/repositories";
import { useAsyncData } from "./use-async-data";
import { usePagedSearch } from "./use-paged-search";

/**
 * A searchable list of options for a select. Loads only while `active`, and
 * reloads when the search term or `extraKey` changes. Typing updates the
 * query immediately.
 */
export function useSearchOptions<T>(
  active: boolean,
  load: (search: string | undefined) => Promise<PagedResult<T>>,
  extraKey = "",
) {
  const { query, search, setQueryNow } = usePagedSearch();
  const { data, error, loading, reload } = useAsyncData(
    () => (active ? load(search || undefined) : Promise.resolve(undefined)),
    `${active}|${extraKey}|${search}`,
  );

  return {
    query,
    setQuery: setQueryNow,
    items: data?.items ?? [],
    error,
    loading,
    reload,
  };
}
