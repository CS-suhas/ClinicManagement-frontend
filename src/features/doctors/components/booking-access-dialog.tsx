"use client";

import { Button, Dialog, Flex } from "@radix-ui/themes";
import Link from "next/link";

export type BookingAccessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayName: string;
  canCreateProfile: boolean;
  returnTo?: string;
};

export function BookingAccessDialog({
  open,
  onOpenChange,
  displayName,
  canCreateProfile,
  returnTo = "/doctors",
}: BookingAccessDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="480px">
        <Dialog.Title>Patient accounts only</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          {canCreateProfile
            ? `You are signed in as ${displayName}, which has no patient profile yet. Only patient accounts can book online, so create a profile first.`
            : `Only patient accounts can book online. ${displayName} is not a patient account.`}
        </Dialog.Description>
        <Flex justify="end" gap="3">
          <Dialog.Close>
            <Button variant="outline" color="gray" highContrast>
              Close
            </Button>
          </Dialog.Close>
          {canCreateProfile && (
            <Button asChild color="teal">
              <Link
                href={`/onboarding?as=patient&next=${encodeURIComponent(returnTo)}`}
              >
                Create patient profile
              </Link>
            </Button>
          )}
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
