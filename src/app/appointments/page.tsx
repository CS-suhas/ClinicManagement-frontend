"use client";

import { PlusIcon } from "@radix-ui/react-icons";
import { Button, Flex, SegmentedControl, Table, Text } from "@radix-ui/themes";
import { useMemo, useState } from "react";
import { useService } from "@/di/container-provider";
import type { Appointment } from "@/domain/entities";
import { patientFullName, providerFullName } from "@/domain/entities";
import { AsyncContent } from "@/presentation/components/async-content";
import { ConfirmDeleteDialog } from "@/presentation/components/confirm-delete-dialog";
import { ErrorCallout } from "@/presentation/components/error-callout";
import { PageHeader } from "@/presentation/components/page-header";
import { RowActions } from "@/presentation/components/row-actions";
import { SearchField } from "@/presentation/components/search-field";
import { useAsyncData } from "@/presentation/hooks/use-async-data";
import { useNow } from "@/presentation/hooks/use-now";
import { formatDateTime, matchesQuery } from "@/presentation/lib/format";
import {
  AppointmentFormDialog,
} from "@/presentation/features/appointments/appointment-form-dialog";

type Range = "upcoming" | "past" | "all";

export default function Page() {
  const appointmentService = useService("appointmentService");
  const patientService = useService("patientService");
  const providerService = useService("providerService");
  const clinicService = useService("clinicService");
  const configurationService = useService("configurationService");

  const { data, loading, error, reload } = useAsyncData(async () => {
    const [appointments, patients, providers, clinics] = await Promise.all([
      appointmentService.list(),
      patientService.list(),
      providerService.list(),
      clinicService.list(),
    ]);
    return { appointments, patients, providers, clinics };
  });
  const {
    data: settings,
    error: settingsError,
    reload: reloadSettings,
  } = useAsyncData(() => configurationService.getAppointmentSettings());

  const [query, setQuery] = useState("");
  const [range, setRange] = useState<Range>("upcoming");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [deleting, setDeleting] = useState<Appointment | null>(null);

  const patients = data?.patients ?? [];
  const providers = data?.providers ?? [];
  const clinics = data?.clinics ?? [];

  const patientById = useMemo(
    () => new Map(patients.map((p) => [p.id, p])),
    [patients],
  );
  const providerById = useMemo(
    () => new Map(providers.map((p) => [p.id, p])),
    [providers],
  );
  const clinicById = useMemo(
    () => new Map(clinics.map((c) => [c.id, c])),
    [clinics],
  );

  const patientName = (id: string) => {
    const p = patientById.get(id);
    return p ? patientFullName(p) : "Unknown patient";
  };
  const providerName = (id: string) => {
    const provider = providerById.get(id);
    return provider ? providerFullName(provider) : "Unknown provider";
  };
  const clinicName = (providerId: string) => {
    const provider = providerById.get(providerId);
    return provider ? (clinicById.get(provider.clinicId)?.name ?? "") : "";
  };

  const now = useNow() ?? 0;
  const time = (a: Appointment) => new Date(a.appointmentDateTime).getTime();
  const rows = (data?.appointments ?? [])
    .filter((a) => {
      const t = time(a);
      if (range === "upcoming" && t < now) return false;
      if (range === "past" && t >= now) return false;
      return matchesQuery(
        query,
        patientName(a.patientId),
        providerName(a.providerId),
        a.reasonForVisit,
      );
    })
    .sort((a, b) => (range === "past" ? time(b) - time(a) : time(a) - time(b)));

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (a: Appointment) => {
    setEditing(a);
    setFormOpen(true);
  };

  const emptyText = query
    ? "No appointments match your search."
    : range === "all"
      ? "No appointments yet."
      : `No ${range} appointments.`;

  return (
    <>
      <PageHeader
        title="Appointments"
        description="Scheduled visits between patients and providers."
        actions={
          <Button onClick={openCreate} disabled={!settings || loading || !data}>
            <PlusIcon /> New appointment
          </Button>
        }
      />
      {settingsError && (
        <Flex mb="3">
          <ErrorCallout
            message={settingsError}
            onRetry={() => void reloadSettings()}
          />
        </Flex>
      )}
      <Flex mb="3" gap="3" wrap="wrap" align="center">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search appointments…"
        />
        <SegmentedControl.Root
          value={range}
          onValueChange={(v) => setRange(v as Range)}
        >
          <SegmentedControl.Item value="upcoming">
            Upcoming
          </SegmentedControl.Item>
          <SegmentedControl.Item value="past">Past</SegmentedControl.Item>
          <SegmentedControl.Item value="all">All</SegmentedControl.Item>
        </SegmentedControl.Root>
      </Flex>

      <AsyncContent
        loading={loading}
        error={error}
        isEmpty={rows.length === 0}
        emptyText={emptyText}
        onRetry={reload}
      >
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Date & time</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Patient</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Provider</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Reason</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell justify="end">
                Actions
              </Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((a) => {
              const patient = patientName(a.patientId);
              const clinic = clinicName(a.providerId);
              return (
                <Table.Row key={a.id} align="center">
                  <Table.RowHeaderCell>
                    {formatDateTime(a.appointmentDateTime)}
                  </Table.RowHeaderCell>
                  <Table.Cell>{patient}</Table.Cell>
                  <Table.Cell>
                    <Flex direction="column">
                      <Text>{providerName(a.providerId)}</Text>
                      {clinic && (
                        <Text size="1" color="gray">
                          {clinic}
                        </Text>
                      )}
                    </Flex>
                  </Table.Cell>
                  <Table.Cell>{a.reasonForVisit}</Table.Cell>
                  <Table.Cell justify="end">
                    <RowActions
                      label={`appointment for ${patient}`}
                      onEdit={() => openEdit(a)}
                      onDelete={() => setDeleting(a)}
                    />
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      </AsyncContent>

      <AppointmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        appointment={editing}
        patients={patients}
        providers={providers}
        clinics={clinics}
        appointments={data?.appointments ?? []}
        settings={settings}
        onSaved={reload}
      />
      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete appointment?"
        description={
          deleting
            ? `The appointment for ${patientName(deleting.patientId)} on ${formatDateTime(deleting.appointmentDateTime)} will be permanently removed. This cannot be undone.`
            : ""
        }
        onConfirm={() => appointmentService.delete(deleting?.id ?? "")}
        onDeleted={reload}
      />
    </>
  );
}
