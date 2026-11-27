"use client";

import { Text } from "@radix-ui/themes";
import { useState } from "react";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { type Column, DataTable } from "@/components/data-table";
import { ClinicChip, ClinicDoctorsChip } from "@/components/glance";
import { ListPage } from "@/components/list-page";
import { RowActions } from "@/components/row-actions";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { PAGE_SIZE } from "@/hooks/use-paged-list";
import { useClinicDoctorPreview, useClinicList, useDeleteClinic } from "../api";
import type { Clinic } from "../schemas";
import { mapsSearchUrl } from "../utils";
import { ClinicDetails } from "./clinic-details";
import { ClinicFormDialog } from "./clinic-form-dialog";

const muted = { color: "var(--mp-muted)" } as const;

export function ClinicList() {
  const list = useClinicList();
  const preview = useClinicDoctorPreview();
  const remove = useDeleteClinic();
  const previewFor = (id: string) => preview.data?.[id];
  const [editing, setEditing] = useState<Clinic | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Clinic | null>(null);

  const openForm = (clinic: Clinic | null) => {
    setEditing(clinic);
    setFormOpen(true);
  };

  const columns: Column<Clinic>[] = [
    {
      id: "name",
      header: "Name",
      sortValue: (c) => c.name,
      cell: (c) => <ClinicChip clinic={{ id: c.id, name: c.name }} />,
    },
    {
      id: "location",
      header: "Location",
      hideBelow: "md",
      cell: (c) =>
        c.address ? (
          <a
            href={mapsSearchUrl(c.address)}
            target="_blank"
            rel="noreferrer"
            className="block max-w-[18rem] truncate text-[13px] underline-offset-2 hover:underline"
            style={{ color: "var(--mp-ink)" }}
            title={`${c.address} (opens a map)`}
          >
            {c.address}
          </a>
        ) : (
          <Text size="2" style={muted}>
            —
          </Text>
        ),
    },
    {
      id: "phone",
      header: "Phone",
      cell: (c) =>
        c.phoneNumber ? (
          <a
            href={`tel:${c.phoneNumber}`}
            className="text-[13px] underline-offset-2 hover:underline"
            style={{ color: "var(--mp-ink)" }}
          >
            {c.phoneNumber}
          </a>
        ) : (
          <Text size="2" style={muted}>
            —
          </Text>
        ),
    },
    {
      id: "doctors",
      header: "Doctors",
      sortValue: (c) => previewFor(c.id)?.count ?? 0,
      cell: (c) => {
        const found = previewFor(c.id);
        if (!found)
          return (
            <Text size="2" style={muted}>
              —
            </Text>
          );
        return (
          <ClinicDoctorsChip
            clinic={{ id: c.id, name: c.name }}
            preview={found}
          />
        );
      },
    },
  ];

  return (
    <>
      <ListPage
        title="Clinics"
        description="Locations where providers practice."
        entity="clinic"
        entityPlural="clinics"
        list={list}
        pageSize={PAGE_SIZE}
        onCreate={() => openForm(null)}
        skeleton={
          <TableSkeleton
            columns={["chip", "text", "text", "chip"]}
            expandable
          />
        }
      >
        <DataTable
          columns={columns}
          rows={list.rows}
          rowLabel={(c) => c.name}
          expandable={{ render: (c) => <ClinicDetails clinic={c} /> }}
          rowActions={(c) => {
            const doctors = previewFor(c.id)?.count ?? 0;
            return (
              <RowActions
                label={c.name}
                onEdit={() => openForm(c)}
                onDelete={() => setDeleting(c)}
                deleteDisabledReason={
                  doctors > 0
                    ? `In use by ${doctors} doctor${doctors === 1 ? "" : "s"}. Move them first.`
                    : undefined
                }
              />
            );
          }}
        />
      </ListPage>

      <ClinicFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        clinic={editing}
      />
      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        title="Delete clinic?"
        description={`"${deleting?.name}" will be permanently removed.`}
      />
    </>
  );
}
