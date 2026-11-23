"use client";

import { useState } from "react";
import type { PatientRosterRow } from "@/application/services/patient-service";
import { useService } from "@/di/container-provider";
import { patientFullName } from "@/domain/entities";
import { AsyncContent } from "@/presentation/components/async-content";
import { PaginationControls } from "@/presentation/components/pagination-controls";
import { useAsyncData } from "@/presentation/hooks/use-async-data";
import { PAGE_SIZE } from "@/presentation/hooks/use-crud-page";
import { useNow } from "@/presentation/hooks/use-now";
import { PatientRosterCard } from "./patient-roster-card";
import { PatientRosterTable } from "./patient-roster-table";

const matchesQuery = (row: PatientRosterRow, needle: string) =>
  [
    patientFullName(row.patient),
    row.patient.email,
    row.patient.phoneNumber,
  ].some((value) => value.toLowerCase().includes(needle));

/**
 * A doctor's roster: the patients who have an appointment with them. Read-only;
 * search and paging run on the loaded rows.
 */
export function DoctorPatientsView({
  providerId,
}: {
  providerId: string | null;
}) {
  const patientService = useService("patientService");
  const now = useNow();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const roster = useAsyncData<PatientRosterRow[]>(
    () =>
      providerId
        ? patientService.listRoster({ providerId, now: Date.now() })
        : Promise.resolve([]),
    providerId ?? "",
  );

  const needle = query.trim().toLowerCase();
  const all = roster.data ?? [];
  const matches = needle ? all.filter((row) => matchesQuery(row, needle)) : all;
  const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = matches.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <PatientRosterCard
      title="My patients"
      subtitle="Patients you've seen or have booked"
      query={query}
      onQueryChange={(value) => {
        setQuery(value);
        setPage(1);
      }}
      searchPlaceholder="Search by name, email or phone…"
      footer={
        roster.data && (
          <PaginationControls
            page={currentPage}
            pageSize={PAGE_SIZE}
            totalCount={matches.length}
            onPageChange={setPage}
          />
        )
      }
    >
      <AsyncContent
        loading={roster.loading}
        error={roster.error}
        isEmpty={rows.length === 0}
        emptyText={
          query ? "No patients match your search." : "No patients yet."
        }
        onRetry={roster.reload}
      >
        <PatientRosterTable rows={rows} now={now} />
      </AsyncContent>
    </PatientRosterCard>
  );
}
