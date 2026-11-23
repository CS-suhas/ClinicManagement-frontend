"use client";

import { useState } from "react";
import { toRosterRow } from "@/application/services/patient-service";
import { useService } from "@/di/container-provider";
import type { Patient } from "@/domain/entities";
import { patientFullName } from "@/domain/entities";
import { AsyncContent } from "@/presentation/components/async-content";
import { ConfirmDeleteDialog } from "@/presentation/components/confirm-delete-dialog";
import { PaginationControls } from "@/presentation/components/pagination-controls";
import { useAsyncData } from "@/presentation/hooks/use-async-data";
import { PAGE_SIZE, useCrudPage } from "@/presentation/hooks/use-crud-page";
import { useNow } from "@/presentation/hooks/use-now";
import { PatientAllergiesDialog } from "./patient-allergies-dialog";
import { PatientFormDialog } from "./patient-form-dialog";
import { PatientRosterCard } from "./patient-roster-card";
import { PatientRosterTable } from "./patient-roster-table";
import { PatientRowMenu } from "./patient-row-menu";

/** Admin's patients page: search, paging, add/edit/delete and allergies, with visit columns. */
export function AdminPatientsView() {
  const patientService = useService("patientService");
  const crud = useCrudPage(patientService, { entityName: "patient" });
  const now = useNow();

  // Visit columns follow the rows on the current page; the key reloads them when that page changes.
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
          emptyText={
            crud.query ? "No patients match your search." : "No patients yet."
          }
          onRetry={crud.reload}
        >
          <PatientRosterTable
            rows={rows}
            now={now}
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
