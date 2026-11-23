"use client";

import { useService } from "@/di/container-provider";
import type { AllergyType } from "@/domain/entities";
import { ConfirmDeleteDialog } from "@/presentation/components/confirm-delete-dialog";
import { type Column, DataTable } from "@/presentation/components/data-table";
import { ListPage } from "@/presentation/components/list-page";
import { AllergyTypeFormDialog } from "@/presentation/features/allergies/allergy-type-form-dialog";
import { PAGE_SIZE, useCrudPage } from "@/presentation/hooks/use-crud-page";

const columns: Column<AllergyType>[] = [
  { header: "Name", cell: (a) => a.name },
];

export default function Page() {
  const crud = useCrudPage(useService("allergyTypeService"), {
    entityName: "allergy",
  });

  return (
    <>
      <ListPage
        title="Allergies"
        description="Catalogue of allergy types that can be recorded on patients."
        entity="allergy"
        entityPlural="allergies"
        list={crud}
        pageSize={PAGE_SIZE}
        onCreate={crud.form.openCreate}
      >
        <DataTable
          columns={columns}
          rows={crud.rows}
          rowLabel={(a) => a.name}
          onEdit={crud.form.openEdit}
          onDelete={crud.setDeleting}
        />
      </ListPage>

      <AllergyTypeFormDialog
        open={crud.form.open}
        onOpenChange={crud.form.onOpenChange}
        allergyType={crud.form.editing}
        onSave={crud.save}
      />
      <ConfirmDeleteDialog
        {...crud.deleteDialog}
        title="Delete allergy?"
        description={`"${crud.deleting?.name}" will be permanently removed. Allergies recorded on patients block deletion.`}
      />
    </>
  );
}
