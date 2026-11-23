"use client";

import { Flex, Spinner } from "@radix-ui/themes";
import { type ReactNode, useMemo, useState } from "react";
import {
  addDays,
  appointmentScopeFor,
  canManageAppointments,
} from "@/application/services/appointment-service";
import { providerFullName } from "@/domain/entities";
import { useAuth } from "@/presentation/auth/auth-provider";
import { ConfirmDeleteDialog } from "@/presentation/components/confirm-delete-dialog";
import { ErrorCallout } from "@/presentation/components/error-callout";
import { PageHeader } from "@/presentation/components/ui/page-header";
import { Surface } from "@/presentation/components/ui/surface";
import { useNow } from "@/presentation/hooks/use-now";
import { formatDateTime } from "@/presentation/lib/format";
import { AppointmentFormDialog } from "./appointment-form-dialog";
import { AppointmentToolbar } from "./appointment-toolbar";
import { DayAgenda } from "./day-agenda";
import { DayCalendar } from "./day-calendar";
import { buildColumns } from "./schedule-columns";
import {
  type AppointmentView,
  clinicWindow,
  clock24,
  dayLabel,
  minutesOfDay,
  toDateKey,
} from "./schedule-time";
import { useAppointmentSchedule } from "./use-appointment-schedule";

/** Day calendar or agenda for the signed-in user's appointments. */
export function AppointmentsView() {
  const { user } = useAuth();
  const scope = useMemo(() => appointmentScopeFor(user), [user]);
  const canWrite = canManageAppointments(scope);

  // The day and "now" are read after mount, so nothing date-dependent prerenders.
  const now = useNow();
  const [dayOffset, setDayOffset] = useState(0);
  const [viewChoice, setViewChoice] = useState<AppointmentView | null>(null);
  const [providerFilter, setProviderFilter] = useState("all");

  const todayKey = now === null ? null : toDateKey(now);
  const dateKey = todayKey === null ? null : addDays(todayKey, dayOffset);
  const schedule = useAppointmentSchedule(dateKey, scope);

  // Patients default to the agenda, since their own visits are few.
  const view: AppointmentView =
    viewChoice ?? (scope.mode === "patient" ? "list" : "calendar");

  const providers = useMemo(
    () =>
      [...(schedule.providers ?? [])].sort((a, b) =>
        providerFullName(a).localeCompare(providerFullName(b)),
      ),
    [schedule.providers],
  );
  const toneOrder = providers.map((provider) => provider.id);
  const items = schedule.items ?? [];

  const filterId =
    scope.mode === "all" && providerFilter !== "all" ? providerFilter : null;
  const visibleItems = filterId
    ? items.filter((item) => item.providerId === filterId)
    : items;
  const columns = buildColumns(scope, providers, items).filter(
    (column) => !filterId || column.id === filterId,
  );
  const showProvider =
    scope.mode === "patient" ||
    new Set(visibleItems.map((item) => item.providerId)).size > 1;

  const clinic = schedule.settings ? clinicWindow(schedule.settings) : null;
  const nowMinutes =
    now === null || dateKey !== todayKey ? null : minutesOfDay(now);
  const nowOffset =
    clinic &&
    nowMinutes !== null &&
    nowMinutes >= clinic.opening &&
    nowMinutes < clinic.closing
      ? nowMinutes - clinic.opening
      : null;

  const loaded =
    dateKey !== null &&
    clinic !== null &&
    schedule.items !== undefined &&
    (scope.mode !== "all" || schedule.providers !== undefined);
  const onEdit = canWrite ? schedule.form.openEdit : undefined;

  let body: ReactNode;
  if (scope.mode === "none")
    body = (
      <Surface>
        <p
          className="m-0 py-6 text-center text-sm"
          style={{ color: "var(--mp-muted)" }}
        >
          No appointments are linked to your account.
        </p>
      </Surface>
    );
  else if (schedule.error)
    body = <ErrorCallout message={schedule.error} onRetry={schedule.retry} />;
  else if (!loaded || !clinic)
    body = (
      <Flex justify="center" py="9">
        <Spinner size="3" />
      </Flex>
    );
  else if (view === "calendar")
    body = (
      <DayCalendar
        columns={columns}
        items={visibleItems}
        clinic={clinic}
        nowOffset={nowOffset}
        toneOrder={toneOrder}
        onEdit={onEdit}
      />
    );
  else
    body = (
      <DayAgenda
        items={visibleItems}
        clinic={clinic}
        nowOffset={nowOffset}
        nowMs={now}
        showProvider={showProvider}
        toneOrder={toneOrder}
        onEdit={onEdit}
      />
    );

  // New appointments start at the clinic's opening time on the viewed day.
  const defaultDateTime =
    dateKey && clinic ? `${dateKey}T${clock24(clinic.opening)}` : undefined;

  return (
    <>
      <PageHeader
        title="Appointments"
        subtitle="Scheduled visits between patients and providers."
      />
      <AppointmentToolbar
        ready={dateKey !== null}
        dateLabel={dateKey ? dayLabel(dateKey) : ""}
        onToday={() => setDayOffset(0)}
        onPrevious={() => setDayOffset((offset) => offset - 1)}
        onNext={() => setDayOffset((offset) => offset + 1)}
        view={view}
        onViewChange={setViewChoice}
        provider={
          scope.mode === "all"
            ? {
                value: providerFilter,
                options: providers.map((provider) => ({
                  id: provider.id,
                  name: providerFullName(provider),
                })),
                onChange: setProviderFilter,
              }
            : undefined
        }
        canWrite={canWrite}
        onCreate={schedule.form.openCreate}
      />
      <div className="mt-4">{body}</div>

      {canWrite && (
        <>
          <AppointmentFormDialog
            open={schedule.form.open}
            onOpenChange={schedule.form.onOpenChange}
            appointment={schedule.form.editing}
            onSave={schedule.save}
            defaultDateTime={defaultDateTime}
            onDelete={(appointment) => {
              schedule.form.onOpenChange(false);
              schedule.setDeleting(appointment);
            }}
          />
          <ConfirmDeleteDialog
            open={schedule.deleting !== null}
            onOpenChange={(open) => !open && schedule.setDeleting(null)}
            title="Delete appointment?"
            description={
              schedule.deleting
                ? `The appointment for ${schedule.deleting.patientName} on ${formatDateTime(schedule.deleting.appointmentDateTime)} will be permanently removed. This cannot be undone.`
                : ""
            }
            onConfirm={() => {
              if (schedule.deleting) schedule.remove(schedule.deleting);
            }}
          />
        </>
      )}
    </>
  );
}
