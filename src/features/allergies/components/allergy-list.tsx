"use client";

import { useState } from "react";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { type Column, DataTable } from "@/components/data-table";
import { AllergyChip } from "@/components/glance/allergy-chip";
import { ListPage } from "@/components/list-page";
import { RowActions } from "@/components/row-actions";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { PAGE_SIZE } from "@/hooks/use-paged-list";
import { byId } from "@/lib/api";
import { useAllergyTypeList, useDeleteAllergyType } from "../api";
import type { AllergyType } from "../schemas";
import { AllergyTypeFormDialog } from "./allergy-type-form-dialog";
import { AllergyUsagePanel } from "./allergy-usage-panel";

function inUseReason(allergy: AllergyType) {
  const count = allergy.patientCount;
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
    sortValue: (a) => a.patientCount,
    cell: (a) => a.patientCount,
  },
];

export function AllergyList() {
  const list = useAllergyTypeList();
  const remove = useDeleteAllergyType();
  const [editing, setEditing] = useState<AllergyType | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<AllergyType | null>(null);

  const openForm = (allergy: AllergyType | null) => {
    setEditing(allergy);
    setFormOpen(true);
  };

  return (
    <>
      <ListPage
        title="Allergies"
        description="Catalogue of allergy types that can be recorded on patients."
        entity="allergy"
        entityPlural="allergies"
        list={list}
        pageSize={PAGE_SIZE}
        onCreate={() => openForm(null)}
        skeleton={<TableSkeleton columns={["chip", "number"]} expandable />}
      >
        <DataTable
          columns={columns}
          rows={list.rows}
          rowLabel={(a) => a.name}
          rowActions={(a) => (
            <RowActions
              label={a.name}
              onEdit={() => openForm(a)}
              onDelete={() => setDeleting(a)}
              deleteDisabledReason={inUseReason(a)}
            />
          )}
          expandable={{ render: (a) => <AllergyUsagePanel allergy={a} /> }}
        />
      </ListPage>

      <AllergyTypeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        allergyType={editing}
      />
      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(byId(deleting.id))}
        title="Delete allergy?"
        description={`"${deleting?.name}" will be permanently removed. Allergies recorded on patients block deletion.`}
      />
    </>
  );
}
