"use client";

import { DotsVerticalIcon } from "@radix-ui/react-icons";
import { DropdownMenu, IconButton } from "@radix-ui/themes";

/** The ⋮ menu of admin actions on a patient row. */
export function PatientRowMenu({
  name,
  onEdit,
  onAllergies,
  onDelete,
}: {
  name: string;
  onEdit: () => void;
  onAllergies: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <IconButton
          variant="ghost"
          color="gray"
          aria-label={`Actions for ${name}`}
        >
          <DotsVerticalIcon />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end">
        <DropdownMenu.Item onSelect={onEdit}>Edit</DropdownMenu.Item>
        <DropdownMenu.Item onSelect={onAllergies}>Allergies</DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item color="red" onSelect={onDelete}>
          Delete
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
