"use client";

import { useState } from "react";
import type { PatientRosterRow } from "@/application/services/patient-service";
import { AsyncContent } from "@/components/async-content";
import { PaginationControls } from "@/components/pagination-controls";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useService } from "@/di/container-provider";
import type { PagedResult } from "@/domain/repositories";
import { useAsyncData } from "@/hooks/use-async-data";
import { PAGE_SIZE } from "@/hooks/use-crud-page";
import { PatientRosterCard } from "./patient-roster-card";
import { PatientRosterTable } from "./patient-roster-table";

export function DoctorPatientsView({
  providerId,
}: {
  providerId: string | null;
}) {
  const patientService = useService("patientService");
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
        skeleton={
          <TableSkeleton
            columns={["chip", "short", "text", "text", "text"]}
            selectable
            expandable
          />
        }
        empty={
          <div className="p-4">
            {search ? (
              <EmptyState
                variant="no-matches"
                title="No patients match"
                description="Try a different name."
                onClearFilters={() => setQuery("")}
              />
            ) : (
              <EmptyState
                title="No patients yet"
                description="Patients appear here after they book with you."
              />
            )}
          </div>
        }
        onRetry={roster.reload}
      >
        <PatientRosterTable rows={rows} />
      </AsyncContent>
    </PatientRosterCard>
  );
}
