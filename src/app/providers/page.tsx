"use client";

import { Flex } from "@radix-ui/themes";
import { useState } from "react";
import { useService } from "@/di/container-provider";
import { type Provider, providerFullName } from "@/domain/entities";
import { ConfirmDeleteDialog } from "@/presentation/components/confirm-delete-dialog";
import { type Column, DataTable } from "@/presentation/components/data-table";
import { ErrorCallout } from "@/presentation/components/error-callout";
import {
  ALL_FILTER,
  FilterSelect,
} from "@/presentation/components/filter-select";
import { ListPage } from "@/presentation/components/list-page";
import { ProviderFormDialog } from "@/presentation/features/providers/provider-form-dialog";
import { useAsyncData } from "@/presentation/hooks/use-async-data";
import { PAGE_SIZE, useCrudPage } from "@/presentation/hooks/use-crud-page";

export default function Page() {
  const clinicService = useService("clinicService");
  const [clinicFilter, setClinicFilter] = useState<string>(ALL_FILTER);
  const crud = useCrudPage(useService("providerService"), {
    extraOptions: () => ({
      clinicId: clinicFilter === ALL_FILTER ? undefined : clinicFilter,
    }),
    extraKey: clinicFilter,
  });
  const {
    data: clinicData,
    error: clinicError,
    loading: clinicsLoading,
    reload: reloadClinics,
  } = useAsyncData(() => clinicService.search({ page: 1, pageSize: 100 }));

  const clinics = clinicData?.items ?? [];
  const clinicName = (id: string) => clinics.find((c) => c.id === id)?.name;
  const columns: Column<Provider>[] = [
    { header: "Name", cell: providerFullName },
    { header: "Specialty", cell: (p) => p.specialty },
    { header: "Clinic", cell: (p) => clinicName(p.clinicId) ?? "—" },
  ];
  const hasFilters = crud.query !== "" || clinicFilter !== ALL_FILTER;

  return (
    <>
      <ListPage
        title="Providers"
        description="Clinicians who see patients at a clinic."
        entity="provider"
        entityPlural="providers"
        list={crud}
        pageSize={PAGE_SIZE}
        onCreate={crud.form.openCreate}
        createDisabled={clinicsLoading || !clinicData}
        emptyText={
          hasFilters ? "No providers match your filters." : "No providers yet."
        }
        banner={
          clinicError && (
            <Flex mb="3">
              <ErrorCallout
                message={clinicError}
                onRetry={() => void reloadClinics()}
              />
            </Flex>
          )
        }
        filters={
          <FilterSelect
            label="Filter by clinic"
            allLabel="All clinics"
            value={clinicFilter}
            options={clinics.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(value) => {
              setClinicFilter(value);
              crud.setPage(1);
            }}
          />
        }
      >
        <DataTable
          columns={columns}
          rows={crud.rows}
          rowLabel={providerFullName}
          onEdit={crud.form.openEdit}
          onDelete={crud.setDeleting}
        />
      </ListPage>

      <ProviderFormDialog
        open={crud.form.open}
        onOpenChange={crud.form.onOpenChange}
        provider={crud.form.editing}
        clinics={clinics}
        onSaved={crud.reload}
      />
      <ConfirmDeleteDialog
        {...crud.deleteDialog}
        title="Delete provider?"
        description={`"${crud.deleting ? providerFullName(crud.deleting) : ""}" will be permanently removed.`}
      />
    </>
  );
}
