"use client";

import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { IconButton, Tooltip } from "@radix-ui/themes";
import { useState } from "react";
import { useService } from "@/di/container-provider";
import { type Patient, patientFullName } from "@/domain/entities";
import { ConfirmDeleteDialog } from "@/presentation/components/confirm-delete-dialog";
import { type Column, DataTable } from "@/presentation/components/data-table";
import { ListPage } from "@/presentation/components/list-page";
import { PatientAllergiesDialog } from "@/presentation/features/patients/patient-allergies-dialog";
import { PatientFormDialog } from "@/presentation/features/patients/patient-form-dialog";
import { PAGE_SIZE, useCrudPage } from "@/presentation/hooks/use-crud-page";
import { formatDate } from "@/presentation/lib/format";

const columns: Column<Patient>[] = [
  { header: "Name", cell: patientFullName },
  { header: "Date of birth", cell: (p) => formatDate(p.dateOfBirth) },
  { header: "Email", cell: (p) => p.email },
  { header: "Phone", cell: (p) => p.phoneNumber },
];

export default function Page() {
  const crud = useCrudPage(useService("patientService"));
  const [allergiesOpen, setAllergiesOpen] = useState(false);
  const [allergyPatient, setAllergyPatient] = useState<Patient | null>(null);

  const openAllergies = (p: Patient) => {
    setAllergyPatient(p);
    setAllergiesOpen(true);
  };

  return (
    <>
      <ListPage
        title="Patients"
        description="People registered at the clinics."
        entity="patient"
        entityPlural="patients"
        list={crud}
        pageSize={PAGE_SIZE}
        onCreate={crud.form.openCreate}
      >
        <DataTable
          columns={columns}
          rows={crud.rows}
          rowLabel={patientFullName}
          onEdit={crud.form.openEdit}
          onDelete={crud.setDeleting}
          extraActions={(p) => (
            <Tooltip content="Allergies">
              <IconButton
                size="1"
                variant="soft"
                color="amber"
                aria-label={`Allergies for ${patientFullName(p)}`}
                onClick={() => openAllergies(p)}
              >
                <ExclamationTriangleIcon />
              </IconButton>
            </Tooltip>
          )}
        />
      </ListPage>

      <PatientFormDialog
        open={crud.form.open}
        onOpenChange={crud.form.onOpenChange}
        patient={crud.form.editing}
        onSaved={crud.reload}
      />
      <PatientAllergiesDialog
        open={allergiesOpen}
        onOpenChange={setAllergiesOpen}
        patient={allergyPatient}
      />
      <ConfirmDeleteDialog
        {...crud.deleteDialog}
        title="Delete patient?"
        description={`"${crud.deleting ? patientFullName(crud.deleting) : ""}" and their allergy records will be permanently removed.`}
      />
    </>
  );
}
