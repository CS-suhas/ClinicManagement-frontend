"use client";

import { ExclamationTriangleIcon, PlusIcon } from "@radix-ui/react-icons";
import { Button, Flex, IconButton, Tooltip } from "@radix-ui/themes";
import { useState } from "react";
import { useService } from "@/di/container-provider";
import { type Patient, patientFullName } from "@/domain/entities";
import { AsyncContent } from "@/presentation/components/async-content";
import { ConfirmDeleteDialog } from "@/presentation/components/confirm-delete-dialog";
import { type Column, DataTable } from "@/presentation/components/data-table";
import { PageHeader } from "@/presentation/components/page-header";
import { PaginationControls } from "@/presentation/components/pagination-controls";
import { SearchField } from "@/presentation/components/search-field";
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
  const patientService = useService("patientService");
  const {
    query,
    page,
    setQuery,
    setPage,
    data,
    rows,
    loading,
    error,
    reload,
    form,
    deleting,
    setDeleting,
    confirmDelete,
  } = useCrudPage(patientService);
  const [allergiesOpen, setAllergiesOpen] = useState(false);
  const [allergyPatient, setAllergyPatient] = useState<Patient | null>(null);
  const openAllergies = (p: Patient) => {
    setAllergyPatient(p);
    setAllergiesOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Patients"
        description="People registered at the clinics."
        actions={
          <Button onClick={form.openCreate}>
            <PlusIcon /> New patient
          </Button>
        }
      />
      <Flex mb="3">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search patients…"
        />
      </Flex>

      <AsyncContent
        loading={loading}
        error={error}
        isEmpty={rows.length === 0}
        emptyText={
          query ? "No patients match your search." : "No patients yet."
        }
        onRetry={reload}
      >
        <DataTable
          columns={columns}
          rows={rows}
          rowLabel={patientFullName}
          onEdit={form.openEdit}
          onDelete={setDeleting}
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
      </AsyncContent>
      {data && (
        <PaginationControls
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={data.totalCount}
          onPageChange={setPage}
        />
      )}

      <PatientFormDialog
        open={form.open}
        onOpenChange={form.onOpenChange}
        patient={form.editing}
        onSaved={reload}
      />
      <PatientAllergiesDialog
        open={allergiesOpen}
        onOpenChange={setAllergiesOpen}
        patient={allergyPatient}
      />
      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete patient?"
        description={`"${deleting ? patientFullName(deleting) : ""}" and their allergy records will be permanently removed.`}
        onConfirm={confirmDelete}
        onDeleted={reload}
      />
    </>
  );
}
