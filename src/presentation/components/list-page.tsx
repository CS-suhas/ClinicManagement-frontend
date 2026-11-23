"use client";

import { PlusIcon } from "@radix-ui/react-icons";
import { Button, Flex } from "@radix-ui/themes";
import type { ReactNode } from "react";
import { AsyncContent } from "./async-content";
import { PageHeader } from "./page-header";
import { PaginationControls } from "./pagination-controls";
import { SearchField } from "./search-field";

/** The slice of `useCrudPage` that ListPage renders. */
interface ListState {
  query: string;
  setQuery: (query: string) => void;
  rows: unknown[];
  loading: boolean;
  error: string | null;
  reload: () => void | Promise<void>;
  data?: { totalCount: number };
  page: number;
  setPage: (page: number) => void;
}

/**
 * Standard list screen: header with create button, search + filters,
 * loading/empty/error states around `children` (the table), and pagination.
 */
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
  banner,
  emptyText,
  children,
}: {
  title: string;
  description: string;
  /** Singular noun for the create button, e.g. "clinic". */
  entity: string;
  /** Plural noun for placeholder and empty text, e.g. "clinics". */
  entityPlural: string;
  list: ListState;
  pageSize: number;
  onCreate: () => void;
  createDisabled?: boolean;
  /** Extra controls next to the search field. */
  filters?: ReactNode;
  /** Shown between the header and the toolbar. */
  banner?: ReactNode;
  /** Overrides the default empty text. */
  emptyText?: string;
  children: ReactNode;
}) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button onClick={onCreate} disabled={createDisabled}>
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
        emptyText={
          emptyText ??
          (list.query
            ? `No ${entityPlural} match your search.`
            : `No ${entityPlural} yet.`)
        }
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
