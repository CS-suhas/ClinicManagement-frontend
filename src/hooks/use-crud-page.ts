"use client";

import { useEffect, useState } from "react";
import type { PagedResult, SearchOptions } from "@/domain/repositories";
import { useAsyncData } from "./use-async-data";
import { useOptimisticMutations } from "./use-optimistic-mutations";
import { usePagedSearch } from "./use-paged-search";

export const PAGE_SIZE = 20;

type CrudPageService<T, TOptions extends SearchOptions, TInput> = {
  search(options: TOptions): Promise<PagedResult<T>>;
  validateInput(input: TInput): void;
  create(input: TInput, id?: string): Promise<unknown>;
  update(id: string, input: TInput): Promise<unknown>;
  delete(id: string): Promise<void>;
};

type UseCrudPageOptions<TOptions extends SearchOptions> = {
  entityName: string;
  extraOptions?: () => Omit<TOptions, keyof SearchOptions>;
  extraKey?: string;
};

export function useCrudPage<
  T extends { id: string },
  TOptions extends SearchOptions = SearchOptions,
  TInput = unknown,
>(
  service: CrudPageService<T, TOptions, TInput>,
  { entityName, extraOptions, extraKey = "" }: UseCrudPageOptions<TOptions>,
) {
  const { query, search, page, setQuery, setPage } = usePagedSearch();
  const { data, loading, error, reload, refresh, mutate } = useAsyncData(
    () =>
      service.search({
        ...extraOptions?.(),
        search: search || undefined,
        page,
        pageSize: PAGE_SIZE,
      } as TOptions),
    `${search}|${extraKey}|${page}`,
  );
  const runOptimistic = useOptimisticMutations(refresh);

  const [formState, setFormState] = useState<{
    open: boolean;
    editing: T | null;
  }>({ open: false, editing: null });
  const [deleting, setDeleting] = useState<T | null>(null);

  useEffect(() => {
    if (data && data.items.length === 0 && data.totalCount > 0 && page > 1)
      setPage(page - 1);
  }, [data, page, setPage]);

  const editItems = (change: (items: T[]) => T[], countChange = 0) =>
    mutate(
      (current) =>
        current && {
          ...current,
          items: change(current.items),
          totalCount: Math.max(0, current.totalCount + countChange),
        },
    );

  const noun = entityName.charAt(0).toUpperCase() + entityName.slice(1);

  const patch = (id: string, change: Partial<T>) =>
    editItems((items) =>
      items.map((item) => (item.id === id ? { ...item, ...change } : item)),
    );

  const save = (input: TInput, editing: T | null, overrides?: Partial<T>) => {
    service.validateInput(input);
    if (editing) {
      const updated = { ...editing, ...input, ...overrides } as T;
      runOptimistic({
        apply: () =>
          editItems((items) =>
            items.map((i) => (i.id === editing.id ? updated : i)),
          ),
        rollback: () =>
          editItems((items) =>
            items.map((i) => (i.id === editing.id ? editing : i)),
          ),
        request: () => service.update(editing.id, input),
        failureMessage: `Could not update ${entityName}`,
        successMessage: `${noun} saved`,
      });
      return;
    }
    const created = {
      ...input,
      id: crypto.randomUUID(),
      ...overrides,
    } as unknown as T;
    runOptimistic({
      apply: () => editItems((items) => [...items, created], 1),
      rollback: () =>
        editItems((items) => items.filter((i) => i.id !== created.id), -1),
      request: () => service.create(input, created.id),
      failureMessage: `Could not add ${entityName}`,
      successMessage: `${noun} added`,
    });
  };

  const remove = (item: T) => {
    let index = -1;
    runOptimistic({
      apply: () =>
        editItems((items) => {
          index = items.findIndex((i) => i.id === item.id);
          return index < 0 ? items : items.filter((i) => i.id !== item.id);
        }, -1),
      rollback: () => {
        if (index < 0) return;
        editItems(
          (items) => [...items.slice(0, index), item, ...items.slice(index)],
          1,
        );
      },
      request: () => service.delete(item.id),
      failureMessage: `Could not delete ${entityName}`,
      successMessage: `${noun} deleted`,
    });
  };

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
    save,
    runOptimistic,
    patch,
    remove,
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
    deleteDialog: {
      open: deleting !== null,
      onOpenChange: (open: boolean) => !open && setDeleting(null),
      onConfirm: () => deleting && remove(deleting),
    },
  };
}
