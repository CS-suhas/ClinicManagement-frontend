"use client";

import { Button, Dialog, Flex } from "@radix-ui/themes";
import type { FormEvent, ReactNode } from "react";
import { ErrorCallout } from "./error-callout";

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel = "Save",
  submitting,
  formError,
  onSubmit,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  submitLabel?: string;
  submitting: boolean;
  formError?: string | null;
  onSubmit: () => void;
  children: ReactNode;
}) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="520px">
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          {description ?? "Fill in the details below."}
        </Dialog.Description>
        <form onSubmit={handleSubmit} noValidate>
          <Flex direction="column" gap="3">
            {formError && <ErrorCallout message={formError} />}
            {children}
          </Flex>
          <Flex gap="3" mt="5" justify="end">
            <Dialog.Close>
              <Button
                type="button"
                variant="soft"
                color="gray"
                disabled={submitting}
              >
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="submit" loading={submitting}>
              {submitLabel}
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
