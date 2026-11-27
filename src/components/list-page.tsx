"use client";

import { PlusIcon } from "@radix-ui/react-icons";
import { Button, Flex } from "@radix-ui/themes";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { AsyncContent } from "./async-content";
import { PaginationControls } from "./pagination-controls";
import { SearchField } from "./search-field";

type ListState = {
  query: string;
  setQuery: (query: string) => void;
  rows: unknown[];
  loading: boolean;
  error: string | null;
  reload: () => void | Promise<void>;
  data?: { totalCount: number };
  page: number;
  setPage: (page: number) => void;
};

export type ActiveFilterChip = {
  id: string;
  label: string;
  onRemove: () => void;
};

export function ListPage({
  title,
  description,
  entity,
  entityPlural,
  list,
  pageSize,
  onCreate,
  createDisabled,
  filters,
  activeFilters,
  onClearFilters,
  banner,
  emptyText,
  skeleton,
  children,
}: {
  title: string;
  description: string;
  entity: string;
  entityPlural: string;
  list: ListState;
  pageSize: number;
  onCreate: () => void;
  createDisabled?: boolean;
  filters?: ReactNode;
  activeFilters?: ActiveFilterChip[];
  onClearFilters?: () => void;
  banner?: ReactNode;
  emptyText?: string;
  skeleton?: ReactNode;
  children: ReactNode;
}) {
  const searching = list.query !== "" || (activeFilters?.length ?? 0) > 0;
  const clearAll = () => {
    list.setQuery("");
    for (const filter of activeFilters ?? []) filter.onRemove();
    onClearFilters?.();
  };
  const empty = searching ? (
    <EmptyState
      variant="no-matches"
      title={`No ${entityPlural} match`}
      description={emptyText ?? "Try a different search or clear the filters."}
      filters={activeFilters?.map((f) => ({ id: f.id, label: f.label }))}
      onRemoveFilter={(id) =>
        activeFilters?.find((f) => f.id === id)?.onRemove()
      }
      onClearFilters={clearAll}
    />
  ) : (
    <EmptyState
      title={`No ${entityPlural} yet`}
      description={emptyText ?? `Add the first ${entity} to see it here.`}
      action={
        <Button color="teal" onClick={onCreate} disabled={createDisabled}>
          <PlusIcon /> New {entity}
        </Button>
      }
    />
  );

  return (
    <>
      <PageHeader
        title={title}
        subtitle={description}
        actions={
          <Button color="teal" onClick={onCreate} disabled={createDisabled}>
            <PlusIcon /> New {entity}
          </Button>
        }
      />
      {banner}
      <Flex mb="3" gap="3" wrap="wrap" align="center">
        <SearchField
          value={list.query}
          onChange={list.setQuery}
          placeholder={`Search ${entityPlural}…`}
        />
        {filters}
      </Flex>

      <AsyncContent
        loading={list.loading}
        error={list.error}
        isEmpty={list.rows.length === 0}
        empty={empty}
        skeleton={skeleton}
        onRetry={list.reload}
      >
        {children}
      </AsyncContent>
      {list.data && (
        <PaginationControls
          page={list.page}
          pageSize={pageSize}
          totalCount={list.data.totalCount}
          onPageChange={list.setPage}
        />
      )}
    </>
  );
}
