"use client";

import { useState } from "react";
import type { PagedResult, SearchOptions } from "@/domain/repositories";
import { useAsyncData } from "./use-async-data";
import { usePagedSearch } from "./use-paged-search";

export const PAGE_SIZE = 20;

interface CrudPageService<T, TOptions extends SearchOptions> {
  search(options: TOptions): Promise<PagedResult<T>>;
  delete(id: string): Promise<void>;
}

interface UseCrudPageOptions<TOptions extends SearchOptions> {
  /** Filter fields merged into every search request (evaluated at load time). */
  extraOptions?: () => Omit<TOptions, keyof SearchOptions>;
  /** Changes whenever `extraOptions` would return something different. */
  extraKey?: string;
}

/**
 * State shared by the list pages: paged search, loading, and the
 * create/edit dialog and delete confirmation targets.
 */
export function useCrudPage<
  T extends { id: string },
  TOptions extends SearchOptions = SearchOptions,
>(
  service: CrudPageService<T, TOptions>,
  { extraOptions, extraKey = "" }: UseCrudPageOptions<TOptions> = {},
) {
  const { query, search, page, setQuery, setPage } = usePagedSearch();
  const { data, loading, error, reload } = useAsyncData(
    () =>
      service.search({
        ...extraOptions?.(),
        search: search || undefined,
        page,
        pageSize: PAGE_SIZE,
      } as TOptions),
    `${search}|${extraKey}|${page}`,
  );

  const [formState, setFormState] = useState<{
    open: boolean;
    editing: T | null;
  }>({ open: false, editing: null });
  const [deleting, setDeleting] = useState<T | null>(null);

  return {
    query,
    page,
    setQuery,
    setPage,
    data,
    rows: data?.items ?? [],
    loading,
    error,
    reload,
    form: {
      open: formState.open,
      editing: formState.editing,
      openCreate: () => setFormState({ open: true, editing: null }),
      openEdit: (item: T) => setFormState({ open: true, editing: item }),
      onOpenChange: (open: boolean) =>
        setFormState((current) => ({ ...current, open })),
    },
    deleting,
    setDeleting,
    confirmDelete: () => service.delete(deleting?.id ?? ""),
  };
}
