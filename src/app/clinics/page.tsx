"use client";

import { useService } from "@/di/container-provider";
import type { Clinic } from "@/domain/entities";
import { ConfirmDeleteDialog } from "@/presentation/components/confirm-delete-dialog";
import { type Column, DataTable } from "@/presentation/components/data-table";
import { ListPage } from "@/presentation/components/list-page";
import { ClinicFormDialog } from "@/presentation/features/clinics/clinic-form-dialog";
import { PAGE_SIZE, useCrudPage } from "@/presentation/hooks/use-crud-page";

const columns: Column<Clinic>[] = [
  { header: "Name", cell: (c) => c.name },
  { header: "Location", cell: (c) => c.location ?? "" },
  { header: "Phone", cell: (c) => c.phoneNumber },
];

export default function Page() {
  const crud = useCrudPage(useService("clinicService"));

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
      >
        <DataTable
          columns={columns}
          rows={crud.rows}
          rowLabel={(c) => c.name}
          onEdit={crud.form.openEdit}
          onDelete={crud.setDeleting}
        />
      </ListPage>

      <ClinicFormDialog
        open={crud.form.open}
        onOpenChange={crud.form.onOpenChange}
        clinic={crud.form.editing}
        onSaved={crud.reload}
      />
      <ConfirmDeleteDialog
        {...crud.deleteDialog}
        title="Delete clinic?"
        description={`"${crud.deleting?.name}" will be permanently removed.`}
      />
    </>
  );
}
