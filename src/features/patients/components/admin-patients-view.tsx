"use client";

import { PlusIcon } from "@radix-ui/react-icons";
import { Button } from "@radix-ui/themes";
import { useState } from "react";
import { AsyncContent } from "@/components/async-content";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { PaginationControls } from "@/components/pagination-controls";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { PAGE_SIZE } from "@/hooks/use-paged-list";
import { useDeletePatient, usePatientList, usePatientVisits } from "../api";
import type { Patient, PatientListItem } from "../schemas";
import { patientFullName, toPatientRow } from "../utils";
import { PatientAllergiesDialog } from "./patient-allergies-dialog";
import { PatientFormDialog } from "./patient-form-dialog";
import { PatientRosterCard } from "./patient-roster-card";
import { PatientRosterTable } from "./patient-roster-table";
import { PatientRowMenu } from "./patient-row-menu";

export function AdminPatientsView() {
  const list = usePatientList();
  const remove = useDeletePatient();
  const visits = usePatientVisits(list.rows.map((patient) => patient.id));

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState<PatientListItem | null>(null);
  const [allergiesOpen, setAllergiesOpen] = useState(false);
  const [allergyPatient, setAllergyPatient] = useState<Patient | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (patient: Patient) => {
    setEditing(patient);
    setFormOpen(true);
  };
  const openAllergies = (patient: Patient) => {
    setAllergyPatient(patient);
    setAllergiesOpen(true);
  };

  const rows = list.rows.map((patient) =>
    toPatientRow(patient, visits.data?.get(patient.id)),
  );

  return (
    <>
      <PatientRosterCard
        title="Patients"
        subtitle="People registered at the clinics."
        query={list.query}
        onQueryChange={list.setQuery}
        searchPlaceholder="Search patients…"
        onAdd={openCreate}
        footer={
          list.data && (
            <PaginationControls
              page={list.page}
              pageSize={PAGE_SIZE}
              totalCount={list.data.totalCount}
              onPageChange={list.setPage}
            />
          )
        }
      >
        <AsyncContent
          loading={list.loading}
          error={list.error}
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
              {list.query ? (
                <EmptyState
                  variant="no-matches"
                  title="No patients match"
                  description="Try a different name, email or phone number."
                  onClearFilters={() => list.setQuery("")}
                />
              ) : (
                <EmptyState
                  title="No patients yet"
                  description="Add a patient, or patients appear here once they book."
                  action={
                    <Button color="teal" onClick={openCreate}>
                      <PlusIcon /> Add Patient
                    </Button>
                  }
                />
              )}
            </div>
          }
          onRetry={list.reload}
        >
          <PatientRosterTable
            rows={rows}
            showProvider
            rowMenu={(row) => (
              <PatientRowMenu
                name={patientFullName(row.patient)}
                onEdit={() => openEdit(row.patient)}
                onAllergies={() => openAllergies(row.patient)}
                onDelete={() => setDeleting(row.patient)}
              />
            )}
          />
        </AsyncContent>
      </PatientRosterCard>

      <PatientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        patient={editing}
      />
      <PatientAllergiesDialog
        open={allergiesOpen}
        onOpenChange={setAllergiesOpen}
        patient={allergyPatient}
      />
      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        title="Delete patient?"
        description={`"${deleting ? patientFullName(deleting) : ""}" and their allergy records will be permanently removed.`}
      />
    </>
  );
}
