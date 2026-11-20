"use client";

import { AlertDialog, Button, Flex } from "@radix-ui/themes";
import { useFormSubmit } from "../hooks/use-form-submit";
import { ErrorCallout } from "./error-callout";

/**
 * Confirmation for destructive actions. `onConfirm` should call the use-case;
 * domain errors (e.g. ConflictError) are shown inside the dialog.
 */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title = "Delete record?",
  description,
  onConfirm,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description: string;
  onConfirm: () => Promise<unknown>;
  onDeleted?: () => void;
}) {
  const { submitting, formError, run, reset } = useFormSubmit();

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const confirm = async () => {
    if (await run(onConfirm)) {
      onOpenChange(false);
      onDeleted?.();
    }
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
      <AlertDialog.Content maxWidth="450px">
        <AlertDialog.Title>{title}</AlertDialog.Title>
        <AlertDialog.Description size="2">
          {description}
        </AlertDialog.Description>
        {formError && (
          <Flex mt="3">
            <ErrorCallout message={formError} />
          </Flex>
        )}
        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray" disabled={submitting}>
              Cancel
            </Button>
          </AlertDialog.Cancel>
          <Button color="red" loading={submitting} onClick={confirm}>
            Delete
          </Button>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
