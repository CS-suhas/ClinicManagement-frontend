"use client";

import { useService } from "@/di/container-provider";
import type { AllergyType } from "@/domain/entities";
import { ConfirmDeleteDialog } from "@/presentation/components/confirm-delete-dialog";
import { type Column, DataTable } from "@/presentation/components/data-table";
import { AllergyChip } from "@/presentation/components/glance/allergy-chip";
import { ListPage } from "@/presentation/components/list-page";
import { RowActions } from "@/presentation/components/row-actions";
import { TableSkeleton } from "@/presentation/components/ui/table-skeleton";
import { AllergyTypeFormDialog } from "@/presentation/features/allergies/allergy-type-form-dialog";
import { AllergyUsagePanel } from "@/presentation/features/allergies/allergy-usage-panel";
import { PAGE_SIZE, useCrudPage } from "@/presentation/hooks/use-crud-page";

/** Why an allergy type cannot be deleted yet, or undefined when it can. */
function inUseReason(allergy: AllergyType): string | undefined {
  const count = allergy.patientCount ?? 0;
  if (count === 0) return undefined;
  return `In use by ${count} ${count === 1 ? "patient" : "patients"}`;
}

const columns: Column<AllergyType>[] = [
  {
    id: "name",
    header: "Name",
    sortValue: (a) => a.name,
    cell: (a) => <AllergyChip name={a.name} allergyId={a.id} showDot={false} />,
  },
  {
    id: "patients",
    header: "Patients",
    align: "end",
    sortValue: (a) => a.patientCount ?? null,
    cell: (a) => (a.patientCount === undefined ? "—" : a.patientCount),
  },
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
        skeleton={<TableSkeleton columns={["chip", "number"]} expandable />}
      >
        <DataTable
          columns={columns}
          rows={crud.rows}
          rowLabel={(a) => a.name}
          rowActions={(a) => (
            <RowActions
              label={a.name}
              onEdit={() => crud.form.openEdit(a)}
              onDelete={() => crud.setDeleting(a)}
              deleteDisabledReason={inUseReason(a)}
            />
          )}
          expandable={{
            render: (a) => <AllergyUsagePanel allergy={a} />,
          }}
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
