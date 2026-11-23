import { Table } from "@radix-ui/themes";
import type { ReactNode } from "react";
import { RowActions } from "./row-actions";

export type Column<T> = {
  header: string;
  cell: (row: T) => ReactNode;
};

/**
 * Table driven by column definitions. The first column is rendered as the
 * row header; an Actions column with edit/delete buttons is always appended.
 */
export function DataTable<T extends { id: string }>({
  columns,
  rows,
  rowLabel,
  onEdit,
  onDelete,
  extraActions,
}: {
  columns: Column<T>[];
  rows: T[];
  /** Accessible name of a row, used by the action buttons. */
  rowLabel: (row: T) => string;
  onEdit: (row: T) => void;
  onDelete: (row: T) => void;
  extraActions?: (row: T) => ReactNode;
}) {
  const [first, ...rest] = columns;

  return (
    <Table.Root variant="surface">
      <Table.Header>
        <Table.Row>
          {columns.map((column) => (
            <Table.ColumnHeaderCell key={column.header}>
              {column.header}
            </Table.ColumnHeaderCell>
          ))}
          <Table.ColumnHeaderCell justify="end">Actions</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {rows.map((row) => (
          <Table.Row key={row.id} align="center">
            <Table.RowHeaderCell>{first.cell(row)}</Table.RowHeaderCell>
            {rest.map((column) => (
              <Table.Cell key={column.header}>{column.cell(row)}</Table.Cell>
            ))}
            <Table.Cell justify="end">
              <RowActions
                label={rowLabel(row)}
                onEdit={() => onEdit(row)}
                onDelete={() => onDelete(row)}
                extra={extraActions?.(row)}
              />
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
