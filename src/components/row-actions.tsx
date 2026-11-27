"use client";

import { Pencil1Icon, TrashIcon } from "@radix-ui/react-icons";
import { Flex, IconButton, Tooltip } from "@radix-ui/themes";
import type { ReactNode } from "react";

/**
 * Edit and delete icon buttons for a table row; `extra` goes first. A button is
 * omitted when its handler is missing. When `deleteDisabledReason` is set, the
 * delete button is disabled and its reason is shown as the tooltip.
 */
export function RowActions({
  label,
  onEdit,
  onDelete,
  deleteDisabledReason,
  extra,
}: {
  label: string;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Why deleting is not allowed right now, e.g. "Remove its doctors first". */
  deleteDisabledReason?: string;
  extra?: ReactNode;
}) {
  return (
    <Flex gap="2" justify="end">
      {extra}
      {onEdit && (
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
      )}
      {onDelete && (
        <Tooltip content={deleteDisabledReason ?? "Delete"}>
          <span className="inline-flex">
            <IconButton
              size="1"
              variant="soft"
              color="red"
              aria-label={`Delete ${label}`}
              disabled={!!deleteDisabledReason}
              onClick={onDelete}
            >
              <TrashIcon />
            </IconButton>
          </span>
        </Tooltip>
      )}
    </Flex>
  );
}
