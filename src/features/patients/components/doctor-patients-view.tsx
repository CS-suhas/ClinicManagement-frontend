"use client";

import { AsyncContent } from "@/components/async-content";
import { PaginationControls } from "@/components/pagination-controls";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { PAGE_SIZE } from "@/hooks/use-paged-list";
import { useProviderRoster } from "../api";
import { PatientRosterCard } from "./patient-roster-card";
import { PatientRosterTable } from "./patient-roster-table";

export function DoctorPatientsView({
  providerId,
}: {
  providerId: string | null;
}) {
  const roster = useProviderRoster(providerId);
  const search = roster.query.trim();

  return (
    <PatientRosterCard
      title="My patients"
      subtitle="Patients you've seen or have booked"
      query={roster.query}
      onQueryChange={roster.setQuery}
      searchPlaceholder="Search by name…"
      footer={
        roster.data && (
          <PaginationControls
            page={roster.page}
            pageSize={PAGE_SIZE}
            totalCount={roster.data.totalCount}
            onPageChange={roster.setPage}
          />
        )
      }
    >
      <AsyncContent
        loading={roster.loading}
        error={roster.error}
        isEmpty={roster.rows.length === 0}
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
                onClearFilters={() => roster.setQuery("")}
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
        <PatientRosterTable rows={roster.rows} />
      </AsyncContent>
    </PatientRosterCard>
  );
}
