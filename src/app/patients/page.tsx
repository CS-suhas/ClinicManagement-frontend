"use client";

import { ExclamationTriangleIcon, PlusIcon } from "@radix-ui/react-icons";
import { Button, Flex, IconButton, Table, Tooltip } from "@radix-ui/themes";
import { useState } from "react";
import { useService } from "@/di/container-provider";
import { type Patient, patientFullName } from "@/domain/entities";
import { AsyncContent } from "@/presentation/components/async-content";
import { ConfirmDeleteDialog } from "@/presentation/components/confirm-delete-dialog";
import { PageHeader } from "@/presentation/components/page-header";
import { RowActions } from "@/presentation/components/row-actions";
import { SearchField } from "@/presentation/components/search-field";
import { useAsyncData } from "@/presentation/hooks/use-async-data";
import { formatDate, matchesQuery } from "@/presentation/lib/format";
import {
  PatientAllergiesDialog,
} from "@/presentation/features/patients/patient-allergies-dialog";
import {
  PatientFormDialog,
} from "@/presentation/features/patients/patient-form-dialog";

export default function Page() {
  const patientService = useService("patientService");
  const { data, loading, error, reload } = useAsyncData(() =>
    patientService.list(),
  );
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState<Patient | null>(null);
  const [allergiesOpen, setAllergiesOpen] = useState(false);
  const [allergyPatient, setAllergyPatient] = useState<Patient | null>(null);

  const rows = (data ?? []).filter((p) =>
    matchesQuery(query, patientFullName(p), p.email, p.phoneNumber),
  );

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (p: Patient) => {
    setEditing(p);
    setFormOpen(true);
  };
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
          <Button onClick={openCreate}>
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
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Date of birth</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Phone</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell justify="end">
                Actions
              </Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((p) => {
              const name = patientFullName(p);
              return (
                <Table.Row key={p.id} align="center">
                  <Table.RowHeaderCell>{name}</Table.RowHeaderCell>
                  <Table.Cell>{formatDate(p.dateOfBirth)}</Table.Cell>
                  <Table.Cell>{p.email}</Table.Cell>
                  <Table.Cell>{p.phoneNumber}</Table.Cell>
                  <Table.Cell justify="end">
                    <RowActions
                      label={name}
                      onEdit={() => openEdit(p)}
                      onDelete={() => setDeleting(p)}
                      extra={
                        <Tooltip content="Allergies">
                          <IconButton
                            size="1"
                            variant="soft"
                            color="amber"
                            aria-label={`Allergies for ${name}`}
                            onClick={() => openAllergies(p)}
                          >
                            <ExclamationTriangleIcon />
                          </IconButton>
                        </Tooltip>
                      }
                    />
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      </AsyncContent>

      <PatientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        patient={editing}
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
        onConfirm={() => patientService.delete(deleting?.id ?? "")}
        onDeleted={reload}
      />
    </>
  );
}
