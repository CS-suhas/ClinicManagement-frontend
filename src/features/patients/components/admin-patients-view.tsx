"use client";

import { PlusIcon } from "@radix-ui/react-icons";
import { Button } from "@radix-ui/themes";
import { useState } from "react";
import { toRosterRow } from "@/application/services/patient-service";
import { AsyncContent } from "@/components/async-content";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { PaginationControls } from "@/components/pagination-controls";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useService } from "@/di/container-provider";
import type { Patient } from "@/domain/entities";
import { patientFullName } from "@/domain/entities";
import { useAsyncData } from "@/hooks/use-async-data";
import { PAGE_SIZE, useCrudPage } from "@/hooks/use-crud-page";
import { PatientAllergiesDialog } from "./patient-allergies-dialog";
import { PatientFormDialog } from "./patient-form-dialog";
import { PatientRosterCard } from "./patient-roster-card";
import { PatientRosterTable } from "./patient-roster-table";
import { PatientRowMenu } from "./patient-row-menu";

export function AdminPatientsView() {
  const patientService = useService("patientService");
  const crud = useCrudPage(patientService, { entityName: "patient" });

  const pageIds = crud.rows.map((patient) => patient.id);
  const visits = useAsyncData(
    () =>
      patientService.visitsByPatient({
        patientIds: crud.rows.map((patient) => patient.id),
        now: Date.now(),
      }),
    pageIds.join(","),
  );

  const [allergiesOpen, setAllergiesOpen] = useState(false);
  const [allergyPatient, setAllergyPatient] = useState<Patient | null>(null);
  const openAllergies = (patient: Patient) => {
    setAllergyPatient(patient);
    setAllergiesOpen(true);
  };

  const rows = crud.rows.map((patient) =>
    toRosterRow(patient, visits.data?.get(patient.id)),
  );

  return (
    <>
      <PatientRosterCard
        title="Patients"
        subtitle="People registered at the clinics."
        query={crud.query}
        onQueryChange={crud.setQuery}
        searchPlaceholder="Search patients…"
        onAdd={crud.form.openCreate}
        footer={
          crud.data && (
            <PaginationControls
              page={crud.page}
              pageSize={PAGE_SIZE}
              totalCount={crud.data.totalCount}
              onPageChange={crud.setPage}
            />
          )
        }
      >
        <AsyncContent
          loading={crud.loading}
          error={crud.error}
          isEmpty={rows.length === 0}
          skeleton={
            <TableSkeleton
              columns={["chip", "short", "chip", "text", "text", "text"]}
              selectable
              expandable
            />
          }
          empty={
            <div className="p-4">
              {crud.query ? (
                <EmptyState
                  variant="no-matches"
                  title="No patients match"
                  description="Try a different name, email or phone number."
                  onClearFilters={() => crud.setQuery("")}
                />
              ) : (
                <EmptyState
                  title="No patients yet"
                  description="Add a patient, or patients appear here once they book."
                  action={
                    <Button color="teal" onClick={crud.form.openCreate}>
                      <PlusIcon /> Add Patient
                    </Button>
                  }
                />
              )}
            </div>
          }
          onRetry={crud.reload}
        >
          <PatientRosterTable
            rows={rows}
            showProvider
            rowMenu={(row) => (
              <PatientRowMenu
                name={patientFullName(row.patient)}
                onEdit={() => crud.form.openEdit(row.patient)}
                onAllergies={() => openAllergies(row.patient)}
                onDelete={() => crud.setDeleting(row.patient)}
              />
            )}
          />
        </AsyncContent>
      </PatientRosterCard>

      <PatientFormDialog
        open={crud.form.open}
        onOpenChange={crud.form.onOpenChange}
        patient={crud.form.editing}
        onSave={crud.save}
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
