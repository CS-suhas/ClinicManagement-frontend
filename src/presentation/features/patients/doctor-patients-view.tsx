"use client";

import { useState } from "react";
import type { PatientRosterRow } from "@/application/services/patient-service";
import { useService } from "@/di/container-provider";
import type { PagedResult } from "@/domain/repositories";
import { AsyncContent } from "@/presentation/components/async-content";
import { PaginationControls } from "@/presentation/components/pagination-controls";
import { useAsyncData } from "@/presentation/hooks/use-async-data";
import { PAGE_SIZE } from "@/presentation/hooks/use-crud-page";
import { useNow } from "@/presentation/hooks/use-now";
import { PatientRosterCard } from "./patient-roster-card";
import { PatientRosterTable } from "./patient-roster-table";

/**
 * A doctor's roster: the patients who have an appointment with them. Read-only;
 * search and paging run on the server.
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
  const search = query.trim();

  const roster = useAsyncData<PagedResult<PatientRosterRow>>(
    () =>
      providerId
        ? patientService.listRoster({
            providerId,
            search: search || undefined,
            page,
            pageSize: PAGE_SIZE,
          })
        : Promise.resolve({
            items: [],
            totalCount: 0,
            page: 1,
            pageSize: PAGE_SIZE,
          }),
    `${providerId ?? ""}|${search}|${page}`,
  );

  const rows = roster.data?.items ?? [];

  return (
    <PatientRosterCard
      title="My patients"
      subtitle="Patients you've seen or have booked"
      query={query}
      onQueryChange={(value) => {
        setQuery(value);
        setPage(1);
      }}
      searchPlaceholder="Search by name…"
      footer={
        roster.data && (
          <PaginationControls
            page={roster.data.page}
            pageSize={PAGE_SIZE}
            totalCount={roster.data.totalCount}
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
          search ? "No patients match your search." : "No patients yet."
        }
        onRetry={roster.reload}
      >
        <PatientRosterTable rows={rows} now={now} />
      </AsyncContent>
    </PatientRosterCard>
  );
}
