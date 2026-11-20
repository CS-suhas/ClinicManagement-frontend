"use client";

import { Pencil1Icon, TrashIcon } from "@radix-ui/react-icons";
import { Flex, IconButton, Tooltip } from "@radix-ui/themes";
import type { ReactNode } from "react";

/** Standard edit/delete icon buttons for a table row; `extra` goes first. */
export function RowActions({
  label,
  onEdit,
  onDelete,
  extra,
}: {
  label: string;
  onEdit: () => void;
  onDelete: () => void;
  extra?: ReactNode;
}) {
  return (
    <Flex gap="2" justify="end">
      {extra}
      <Tooltip content="Edit">
        <IconButton
          size="1"
          variant="soft"
          aria-label={`Edit ${label}`}
          onClick={onEdit}
        >
          <Pencil1Icon />
        </IconButton>
      </Tooltip>
      <Tooltip content="Delete">
        <IconButton
          size="1"
          variant="soft"
          color="red"
          aria-label={`Delete ${label}`}
          onClick={onDelete}
        >
          <TrashIcon />
        </IconButton>
      </Tooltip>
    </Flex>
  );
}
