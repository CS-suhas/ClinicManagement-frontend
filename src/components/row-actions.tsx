"use client";

import { Pencil1Icon, TrashIcon } from "@radix-ui/react-icons";
import { Flex, IconButton, Tooltip } from "@radix-ui/themes";
import type { ReactNode } from "react";

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
