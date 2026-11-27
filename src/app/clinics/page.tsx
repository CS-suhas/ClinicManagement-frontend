"use client";

import { Text } from "@radix-ui/themes";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { type Column, DataTable } from "@/components/data-table";
import { ClinicChip, ClinicDoctorsChip } from "@/components/glance";
import { ListPage } from "@/components/list-page";
import { RowActions } from "@/components/row-actions";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useService } from "@/di/container-provider";
import type { Clinic } from "@/domain/entities";
import { ClinicDetails } from "@/features/clinics/components/clinic-details";
import { ClinicFormDialog } from "@/features/clinics/components/clinic-form-dialog";
import { useAsyncData } from "@/hooks/use-async-data";
import { PAGE_SIZE, useCrudPage } from "@/hooks/use-crud-page";

const muted = { color: "var(--mp-muted)" } as const;

export default function Page() {
  const glance = useService("glanceService");
  const crud = useCrudPage(useService("clinicService"), {
    entityName: "clinic",
  });
  // One directory read gives every clinic's doctor count and avatars.
  const preview = useAsyncData(() => glance.getClinicDoctorPreview());
  const previewFor = (id: string) => preview.data?.get(id);

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
        c.location ? (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.location)}`}
            target="_blank"
            rel="noreferrer"
            className="block max-w-[18rem] truncate text-[13px] underline-offset-2 hover:underline"
            style={{ color: "var(--mp-ink)" }}
            title={`${c.location} (opens a map)`}
          >
            {c.location}
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
        list={crud}
        pageSize={PAGE_SIZE}
        onCreate={crud.form.openCreate}
        skeleton={
          <TableSkeleton
            columns={["chip", "text", "text", "chip"]}
            expandable
          />
        }
      >
        <DataTable
          columns={columns}
          rows={crud.rows}
          rowLabel={(c) => c.name}
          expandable={{ render: (c) => <ClinicDetails clinic={c} /> }}
          rowActions={(c) => {
            const doctors = previewFor(c.id)?.count ?? 0;
            return (
              <RowActions
                label={c.name}
                onEdit={() => crud.form.openEdit(c)}
                onDelete={() => crud.setDeleting(c)}
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
        open={crud.form.open}
        onOpenChange={crud.form.onOpenChange}
        clinic={crud.form.editing}
        onSave={crud.save}
      />
      <ConfirmDeleteDialog
        {...crud.deleteDialog}
        title="Delete clinic?"
        description={`"${crud.deleting?.name}" will be permanently removed.`}
      />
    </>
  );
}
