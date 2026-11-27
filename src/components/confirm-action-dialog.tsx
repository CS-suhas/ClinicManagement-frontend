"use client";

import { AlertDialog, Button, Flex } from "@radix-ui/themes";
import type { ReactNode } from "react";

/**
 * Confirmation for an action that is not a plain delete, e.g. bulk verify.
 * Unlike ConfirmDeleteDialog, `onConfirm` may be async: the dialog stays open
 * while `busy` and closes when `onOpenChange(false)` is called after it finishes.
 */
export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  confirmColor = "teal",
  busy = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  confirmColor?: "teal" | "red";
  busy?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => !busy && onOpenChange(next)}
    >
      <AlertDialog.Content maxWidth="480px">
        <AlertDialog.Title>{title}</AlertDialog.Title>
        <div className="mt-2 text-[14px]" style={{ color: "var(--mp-muted)" }}>
          {description}
        </div>
        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray" disabled={busy}>
              Cancel
            </Button>
          </AlertDialog.Cancel>
          <Button color={confirmColor} loading={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
