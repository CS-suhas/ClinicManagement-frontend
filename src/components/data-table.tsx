"use client";

import {
  CaretDownIcon,
  CaretUpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@radix-ui/react-icons";
import { Button, Flex, Text } from "@radix-ui/themes";
import { Fragment, type ReactNode, useEffect, useId, useState } from "react";
import { Surface } from "@/components/ui/surface";
import { RowActions } from "./row-actions";

export type Column<T> = {
  id?: string;
  header: string;
  cell: (row: T) => ReactNode;
  width?: string | number;
  align?: "start" | "center" | "end";
  hideBelow?: "sm" | "md";
  sortValue?: (row: T) => string | number | null;
};

export type ExpandableOptions<T> = {
  render: (row: T) => ReactNode;
  isExpandable?: (row: T) => boolean;
};

export type SelectionOptions<T> = {
  bulkActions: (selected: T[], clear: () => void) => ReactNode;
  isSelectable?: (row: T) => boolean;
  disabledReason?: (row: T) => string | undefined;
};

export type DataTableProps<T extends { id: string }> = {
  columns: Column<T>[];
  rows: T[];
  rowLabel: (row: T) => string;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  extraActions?: (row: T) => ReactNode;
  rowActions?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
  expandable?: ExpandableOptions<T>;
  selection?: SelectionOptions<T>;
  caption?: string;
};

type SortState = {
  columnId: string;
  direction: "asc" | "desc";
};

const HEAD_CELL = "px-4 py-2.5 text-[13px] font-medium whitespace-nowrap";
const BODY_CELL = "px-4 py-3 align-middle";

const alignClass = (align: Column<unknown>["align"]) =>
  align === "end"
    ? "text-right"
    : align === "center"
      ? "text-center"
      : "text-left";

const hideClass = (hideBelow: Column<unknown>["hideBelow"]) =>
  hideBelow === "sm"
    ? "max-sm:hidden"
    : hideBelow === "md"
      ? "max-md:hidden"
      : "";

const INTERACTIVE_SELECTOR =
  "button, a, input, select, textarea, label, [role='button'], [role='menuitem'], [role='dialog']";

function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element && target.closest(INTERACTIVE_SELECTOR) !== null
  );
}

function compareValues(a: string | number | null, b: string | number | null) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  rowLabel,
  onEdit,
  onDelete,
  extraActions,
  rowActions,
  onRowClick,
  expandable,
  selection,
  caption,
}: DataTableProps<T>) {
  const tableId = useId();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [sort, setSort] = useState<SortState | null>(null);

  useEffect(() => {
    const visible = new Set(rows.map((row) => row.id));
    setSelected((current) => {
      const next = new Set([...current].filter((id) => visible.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [rows]);

  const hasActions = !!(onEdit || onDelete || rowActions || extraActions);
  const isSelectable = (row: T) => selection?.isSelectable?.(row) ?? true;
  const selectableRows = selection ? rows.filter(isSelectable) : [];
  const allSelected =
    selectableRows.length > 0 &&
    selectableRows.every((row) => selected.has(row.id));
  const someSelected =
    !allSelected && selectableRows.some((row) => selected.has(row.id));
  const selectedRows = rows.filter((row) => selected.has(row.id));
  const clearSelection = () => setSelected(new Set());

  const sortColumn = sort
    ? columns.find((c) => (c.id ?? c.header) === sort.columnId)
    : undefined;
  const shownRows =
    sortColumn?.sortValue && sort
      ? [...rows].sort((a, b) => {
          const result = compareValues(
            sortColumn.sortValue?.(a) ?? null,
            sortColumn.sortValue?.(b) ?? null,
          );
          return sort.direction === "asc" ? result : -result;
        })
      : rows;

  const toggleSort = (column: Column<T>) => {
    const columnId = column.id ?? column.header;
    setSort((current) => {
      if (current?.columnId !== columnId) return { columnId, direction: "asc" };
      if (current.direction === "asc") return { columnId, direction: "desc" };
      return null;
    });
  };

  const toggleRow = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpanded = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(selectableRows.map((row) => row.id)));
  };

  const actionsFor = (row: T) => {
    const extra = extraActions?.(row);
    if (rowActions)
      return (
        <Flex gap="2" justify="end" align="center">
          {extra}
          {rowActions(row)}
        </Flex>
      );
    if (onEdit || onDelete)
      return (
        <RowActions
          label={rowLabel(row)}
          onEdit={onEdit && (() => onEdit(row))}
          onDelete={onDelete && (() => onDelete(row))}
          extra={extra}
        />
      );
    return extra ?? null;
  };

  const columnCount =
    columns.length +
    (selection ? 1 : 0) +
    (expandable ? 1 : 0) +
    (hasActions ? 1 : 0);

  return (
    <Surface padding="none" className="overflow-hidden">
      <div className="max-h-[calc(100dvh-16rem)] overflow-auto">
        <table className="mp-table w-full border-collapse">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {selection && (
                <th
                  scope="col"
                  className={`${HEAD_CELL} w-10`}
                  style={stickyHeadStyle}
                >
                  <input
                    type="checkbox"
                    aria-label="Select all rows on this page"
                    className="h-4 w-4 cursor-pointer"
                    style={{ accentColor: "var(--mp-primary)" }}
                    disabled={selectableRows.length === 0}
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleAll}
                  />
                </th>
              )}
              {expandable && (
                <th
                  scope="col"
                  className={`${HEAD_CELL} w-10`}
                  style={stickyHeadStyle}
                >
                  <span className="sr-only">Expand</span>
                </th>
              )}
              {columns.map((column, index) => {
                const columnId = column.id ?? column.header;
                const active = sort?.columnId === columnId;
                return (
                  <th
                    key={columnId}
                    scope="col"
                    aria-sort={
                      column.sortValue
                        ? active
                          ? sort?.direction === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                        : undefined
                    }
                    className={`${HEAD_CELL} ${alignClass(column.align)} ${hideClass(column.hideBelow)} ${
                      index === 0
                        ? "max-md:sticky max-md:left-0 max-md:z-[3]"
                        : ""
                    }`}
                    style={{ ...stickyHeadStyle, width: column.width }}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mp-ink)]"
                        style={{ color: "inherit" }}
                      >
                        {column.header}
                        {active &&
                          (sort?.direction === "asc" ? (
                            <CaretUpIcon aria-hidden="true" />
                          ) : (
                            <CaretDownIcon aria-hidden="true" />
                          ))}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
              {hasActions && (
                <th
                  scope="col"
                  className={`${HEAD_CELL} text-right`}
                  style={stickyHeadStyle}
                >
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {shownRows.map((row) => {
              const isOpen = expanded.has(row.id);
              const canExpand = expandable
                ? (expandable.isExpandable?.(row) ?? true)
                : false;
              const isSelected = selected.has(row.id);
              const label = rowLabel(row);
              return (
                <Fragment key={row.id}>
                  <tr
                    data-selected={isSelected ? "true" : undefined}
                    className={onRowClick ? "cursor-pointer" : undefined}
                    onClick={
                      onRowClick
                        ? (event) => {
                            if (!isInteractiveTarget(event.target))
                              onRowClick(row);
                          }
                        : undefined
                    }
                  >
                    {selection && (
                      <td className={`${BODY_CELL} w-10`}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${label}`}
                          className="h-4 w-4 cursor-pointer"
                          style={{ accentColor: "var(--mp-primary)" }}
                          checked={isSelected}
                          disabled={!isSelectable(row)}
                          title={
                            isSelectable(row)
                              ? undefined
                              : selection.disabledReason?.(row)
                          }
                          onChange={() => toggleRow(row.id)}
                        />
                      </td>
                    )}
                    {expandable && (
                      <td className={`${BODY_CELL} w-10`}>
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          aria-controls={`${tableId}-${row.id}`}
                          aria-label={`${isOpen ? "Hide" : "Show"} details for ${label}`}
                          disabled={!canExpand}
                          onClick={() => toggleExpanded(row.id)}
                          className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full disabled:cursor-default disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mp-ink)]"
                          style={{ color: "var(--mp-muted)" }}
                        >
                          {isOpen ? (
                            <ChevronDownIcon aria-hidden="true" />
                          ) : (
                            <ChevronRightIcon aria-hidden="true" />
                          )}
                        </button>
                      </td>
                    )}
                    {columns.map((column, index) =>
                      index === 0 ? (
                        <th
                          key={column.id ?? column.header}
                          scope="row"
                          className={`${BODY_CELL} font-normal ${alignClass(column.align)} ${hideClass(column.hideBelow)} max-md:sticky max-md:left-0 max-md:z-[1] max-md:bg-[var(--mp-surface)]`}
                          style={{ width: column.width }}
                        >
                          {column.cell(row)}
                        </th>
                      ) : (
                        <td
                          key={column.id ?? column.header}
                          className={`${BODY_CELL} ${alignClass(column.align)} ${hideClass(column.hideBelow)}`}
                          style={{ width: column.width }}
                        >
                          {column.cell(row)}
                        </td>
                      ),
                    )}
                    {hasActions && (
                      <td className={`${BODY_CELL} text-right`}>
                        {actionsFor(row)}
                      </td>
                    )}
                  </tr>
                  {expandable && isOpen && (
                    <tr id={`${tableId}-${row.id}`} data-expanded-for={row.id}>
                      <td
                        colSpan={columnCount}
                        className="px-6 py-4"
                        style={{ background: "var(--mp-paper)" }}
                      >
                        {expandable.render(row)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {selection && selectedRows.length > 0 && (
        <section
          aria-label="Selected rows"
          className="sticky bottom-0 z-[4] flex flex-wrap items-center gap-3 border-t px-4 py-3"
          style={{
            background: "var(--mp-surface)",
            borderColor: "var(--mp-paper-deep)",
          }}
        >
          <Text size="2" weight="medium" style={{ color: "var(--mp-ink)" }}>
            {selectedRows.length} selected
          </Text>
          {selection.bulkActions(selectedRows, clearSelection)}
          <Button
            variant="ghost"
            color="gray"
            size="1"
            onClick={clearSelection}
          >
            Clear
          </Button>
        </section>
      )}
    </Surface>
  );
}

const stickyHeadStyle = {
  position: "sticky" as const,
  top: 0,
  zIndex: 2,
  background: "var(--mp-paper)",
  boxShadow: "inset 0 -1px 0 var(--mp-paper-deep)",
};
