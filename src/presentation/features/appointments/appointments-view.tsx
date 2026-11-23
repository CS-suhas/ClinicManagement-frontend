"use client";

import { Button, Flex, Spinner, Text } from "@radix-ui/themes";
import { useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { canBookOnline } from "@/application/auth/permissions";
import {
  type AppointmentScope,
  allowedActions,
  appointmentScopeFor,
  canManageAppointments,
} from "@/application/services/appointment-service";
import { useService } from "@/di/container-provider";
import {
  APPOINTMENT_STATUSES,
  type AppointmentAction,
  type AppointmentStatus,
  providerFullName,
} from "@/domain/entities";
import type { AppointmentListItem } from "@/domain/repositories";
import { useAuth } from "@/presentation/auth/auth-provider";
import { ConfirmActionDialog } from "@/presentation/components/confirm-action-dialog";
import { ConfirmDeleteDialog } from "@/presentation/components/confirm-delete-dialog";
import { ErrorCallout } from "@/presentation/components/error-callout";
import { PageHeader } from "@/presentation/components/ui/page-header";
import { severityLevel } from "@/presentation/components/ui/severity";
import { Surface } from "@/presentation/components/ui/surface";
import { DoctorBookingDialogs } from "@/presentation/features/doctors/doctor-booking-dialogs";
import { DoctorPickerDialog } from "@/presentation/features/doctors/doctor-picker-dialog";
import type { DoctorProfile } from "@/presentation/features/doctors/doctor-profile";
import { findBookableDoctor } from "@/presentation/features/doctors/use-bookable-doctor";
import { useBookingGate } from "@/presentation/features/doctors/use-booking-gate";
import { useAsyncData } from "@/presentation/hooks/use-async-data";
import { useNow } from "@/presentation/hooks/use-now";
import { formatDateTime } from "@/presentation/lib/format";
import { AppointmentFormDialog } from "./appointment-form-dialog";
import { timeSpan } from "./appointment-parts";
import {
  type DateRange,
  dayHeading,
  monthGridDays,
  monthLabel,
  type RangeMode,
  rangeFor,
  shiftDate,
  weekDays,
  weekLabel,
} from "./appointment-range";
import {
  ALL_STATUSES,
  AppointmentToolbar,
  type StatusFilter,
  viewOptions,
} from "./appointment-toolbar";
import { DayAgenda } from "./day-agenda";
import { DayCalendar } from "./day-calendar";
import { MonthCalendar } from "./month-calendar";
import { PendingRequestsInbox } from "./pending-requests-inbox";
import { buildColumns } from "./schedule-columns";
import {
  type AppointmentView,
  clinicWindow,
  clock24,
  dayLabel,
  minutesOfDay,
  toDateKey,
} from "./schedule-time";
import {
  ACTION_LABEL,
  type PendingAction,
  useAppointmentActions,
} from "./use-appointment-actions";
import { useAppointmentSchedule } from "./use-appointment-schedule";
import { useNarrowViewport } from "./use-narrow-viewport";
import { usePendingRequests } from "./use-pending-requests";
import { WeekCalendar } from "./week-calendar";
import { WeekStrip } from "./week-strip";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const BOOK_RETURN = "/appointments?book=1";

/**
 * The appointments page. Patients see a month grid (default) or a list and can
 * book. Doctors see a day view (default), a week grid or a list, with the
 * pending-requests inbox on top. Admins and clinic admins see a day view with
 * provider columns, or a list. The view, date and status live in the URL.
 */
export function AppointmentsView() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const providerService = useService("providerService");
  const clinicService = useService("clinicService");
  const gate = useBookingGate();
  const narrow = useNarrowViewport();
  // The clock is read after mount only, so nothing date-dependent prerenders.
  const now = useNow();
  const todayKey = now === null ? null : toDateKey(now);

  const baseScope = useMemo(() => appointmentScopeFor(user), [user]);
  const role =
    baseScope.mode === "patient"
      ? "patient"
      : baseScope.mode === "provider"
        ? "doctor"
        : "staff";
  const isPatient = role === "patient";
  const isDoctor = role === "doctor";
  const canBook = isPatient && canBookOnline(user);

  // Clinic admins of several clinics pick one; the scope follows the pick.
  const [clinicChoice, setClinicChoice] = useState<string | null>(null);
  const manyClinics =
    baseScope.mode === "clinic" && baseScope.clinicIds.length > 1;
  const clinics = useAsyncData(
    () => (manyClinics ? clinicService.list() : Promise.resolve([])),
    manyClinics ? "many" : "one",
  );
  const scope: AppointmentScope = useMemo(
    () =>
      baseScope.mode === "clinic" &&
      clinicChoice !== null &&
      baseScope.clinicIds.includes(clinicChoice)
        ? { ...baseScope, clinicId: clinicChoice }
        : baseScope,
    [baseScope, clinicChoice],
  );
  const canWrite = canManageAppointments(scope);

  // URL state: view, date and status.
  const urlView = searchParams.get("view");
  const urlDate = searchParams.get("date");
  const urlStatus = searchParams.get("status");
  const statusFilter: StatusFilter = (
    APPOINTMENT_STATUSES as readonly string[]
  ).includes(urlStatus ?? "")
    ? (urlStatus as AppointmentStatus)
    : ALL_STATUSES;

  const updateParams = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    router.replace(query ? `/appointments?${query}` : "/appointments", {
      scroll: false,
    });
  };

  const options = viewOptions(role);
  const defaultView: AppointmentView = isPatient ? "month" : "day";
  const requestedView = options.some((option) => option.value === urlView)
    ? (urlView as AppointmentView)
    : defaultView;
  // Narrow screens force the agenda (patients keep the compact month grid).
  const view: AppointmentView = narrow
    ? isPatient
      ? "month"
      : "list"
    : requestedView;
  const selectedDate =
    urlDate && DATE_PATTERN.test(urlDate) ? urlDate : todayKey;
  const rangeMode: RangeMode =
    view === "month" || (view === "list" && isPatient)
      ? "month"
      : view === "week"
        ? "week"
        : "day";
  const range: DateRange | null =
    todayKey !== null && selectedDate !== null
      ? rangeFor(rangeMode, selectedDate)
      : null;

  const schedule = useAppointmentSchedule(range, scope);
  const items = schedule.items ?? [];
  const settings = schedule.settings;
  const duration = settings?.appointmentDurationMinutes ?? 20;
  const inbox = usePendingRequests(
    isDoctor && scope.mode === "provider" ? scope.providerId : null,
    todayKey,
  );

  const [providerFilter, setProviderFilter] = useState("all");
  const providers = useMemo(
    () =>
      [...(schedule.providers ?? [])].sort((a, b) =>
        providerFullName(a).localeCompare(providerFullName(b)),
      ),
    [schedule.providers],
  );
  const toneOrder = providers.map((provider) => provider.id);
  const filterId =
    scope.mode === "all" && providerFilter !== "all" ? providerFilter : null;
  const visibleItems = items.filter(
    (item) =>
      (statusFilter === ALL_STATUSES || item.status === statusFilter) &&
      (!filterId || item.providerId === filterId),
  );
  const columns = buildColumns(scope, providers, items).filter(
    (column) => !filterId || column.id === filterId,
  );
  const showProvider =
    scope.mode === "patient" ||
    new Set(visibleItems.map((item) => item.providerId)).size > 1;

  const clinic = settings ? clinicWindow(settings) : null;
  const nowMinutes = now === null ? null : minutesOfDay(now);
  const todayOffset =
    clinic &&
    nowMinutes !== null &&
    nowMinutes >= clinic.opening &&
    nowMinutes < clinic.closing
      ? nowMinutes - clinic.opening
      : null;
  // The now-line belongs to the day view only when that day is today.
  const dayOffset = selectedDate === todayKey ? todayOffset : null;

  // Status changes: optimistic, applied to every loaded list.
  const actions = useAppointmentActions(
    (change) => {
      schedule.mutateItems(change);
      inbox.mutateItems(change);
    },
    () => {
      schedule.refresh();
      inbox.refresh();
    },
  );
  const [pending, setPending] = useState<PendingAction | null>(null);
  const actionsFor = (item: AppointmentListItem) => allowedActions(item, user);
  const onAct = (item: AppointmentListItem, action: AppointmentAction) => {
    const next = actions.start(item, action);
    if (next) setPending(next);
  };
  const showAllergy = !isPatient;
  const common = {
    scope,
    now,
    actionsFor,
    onAct,
    onEdit: canWrite ? schedule.form.openEdit : undefined,
    showAllergy,
  };

  // Patient booking: doctor picker, then slots and details.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState<string | null>(null);
  const openBooking = (dateKey: string | null) => {
    setBookingDate(dateKey);
    setPickerOpen(true);
  };
  const pickDoctor = (doctor: DoctorProfile) => {
    setPickerOpen(false);
    gate.requestBooking(doctor, BOOK_RETURN);
    if (bookingDate) gate.booking.setDateKey(bookingDate);
  };

  // ?book=1 opens booking for a patient (with ?providerId= to preselect the
  // doctor); for admins ?book=1&patientId= opens the form with that patient.
  const bookParam = searchParams.get("book") === "1";
  const providerParam = searchParams.get("providerId");
  const patientParam = searchParams.get("patientId");
  const handledBook = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: opens once per URL request.
  useEffect(() => {
    if (handledBook.current || !bookParam || authLoading || !user) return;
    if (canBook) {
      handledBook.current = true;
      if (providerParam) {
        void findBookableDoctor(providerService, providerParam).then(
          (doctor) => {
            if (doctor) gate.requestBooking(doctor, BOOK_RETURN);
            else setPickerOpen(true);
          },
        );
      } else setPickerOpen(true);
    } else if (canWrite && patientParam) {
      handledBook.current = true;
      schedule.form.openCreate(patientParam);
    }
  }, [
    bookParam,
    providerParam,
    patientParam,
    authLoading,
    user,
    canBook,
    canWrite,
  ]);

  const loaded =
    range !== null &&
    clinic !== null &&
    schedule.items !== undefined &&
    (scope.mode !== "all" || schedule.providers !== undefined);

  const navMode = rangeMode;
  const navLabel =
    selectedDate === null
      ? ""
      : navMode === "month"
        ? monthLabel(selectedDate)
        : navMode === "week"
          ? weekLabel(selectedDate)
          : dayLabel(selectedDate);

  const selectDay = (dateKey: string) => updateParams({ date: dateKey });
  const emptyText = "No appointments in this period.";

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
  else if (!loaded || !clinic || !range || !selectedDate)
    body = (
      <Flex justify="center" py="9">
        <Spinner size="3" />
      </Flex>
    );
  else if (view === "month") {
    const selectedItems = visibleItems;
    const dayEmpty = !selectedItems.some(
      (item) => item.appointmentDateTime.slice(0, 10) === selectedDate,
    );
    const bookable =
      canBook && dayEmpty && todayKey !== null && selectedDate >= todayKey;
    body = (
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <MonthCalendar
          {...common}
          days={monthGridDays(selectedDate)}
          monthDate={selectedDate}
          todayKey={todayKey}
          selectedKey={selectedDate}
          items={visibleItems}
          compact={narrow}
          canBook={canBook}
          onSelectDay={selectDay}
          onBookDay={openBooking}
        />
        <Surface
          padding="md"
          aria-label={`Visits on ${dayHeading(selectedDate)}`}
        >
          <Flex align="center" justify="between" mb="3" gap="2" wrap="wrap">
            <h2
              className="m-0 text-base font-semibold"
              style={{ color: "var(--mp-ink)" }}
            >
              {dayHeading(selectedDate)}
            </h2>
            {bookable && (
              <Button
                size="1"
                color="teal"
                onClick={() => openBooking(selectedDate)}
              >
                Book on this day
              </Button>
            )}
          </Flex>
          <DayAgenda
            {...common}
            items={selectedItems}
            days={[selectedDate]}
            todayKey={todayKey}
            duration={duration}
            showProvider={showProvider}
            providerOrder={toneOrder}
            emptyText="No visits on this day."
          />
        </Surface>
      </div>
    );
  } else if (view === "week")
    body = (
      <WeekCalendar
        {...common}
        days={weekDays(selectedDate)}
        todayKey={todayKey}
        items={visibleItems}
        clinic={clinic}
        nowOffset={todayOffset}
        onPickDay={(dateKey) => updateParams({ date: dateKey, view: "day" })}
      />
    );
  else if (view === "day")
    body = (
      <DayCalendar
        {...common}
        columns={columns}
        items={visibleItems}
        clinic={clinic}
        nowOffset={dayOffset}
        toneOrder={toneOrder}
      />
    );
  else
    body = (
      <DayAgenda
        {...common}
        items={visibleItems}
        days={range.days}
        todayKey={todayKey}
        duration={duration}
        showProvider={showProvider}
        providerOrder={toneOrder}
        emptyText={emptyText}
      />
    );

  return (
    <>
      <PageHeader
        title="Appointments"
        subtitle={
          isPatient
            ? "Your visits. Book a new one with a doctor."
            : "Scheduled visits between patients and doctors."
        }
      />

      {isDoctor && (
        <div className="mb-4">
          <PendingRequestsInbox
            items={inbox.items}
            more={inbox.more}
            loading={inbox.loading}
            error={inbox.error}
            onRetry={inbox.reload}
            scope={scope}
            actionsFor={actionsFor}
            onAct={onAct}
            duration={duration}
          />
        </div>
      )}

      <AppointmentToolbar
        ready={selectedDate !== null}
        navLabel={navLabel}
        onToday={() => updateParams({ date: null })}
        onPrevious={() =>
          selectedDate &&
          updateParams({ date: shiftDate(navMode, selectedDate, -1) })
        }
        onNext={() =>
          selectedDate &&
          updateParams({ date: shiftDate(navMode, selectedDate, 1) })
        }
        view={view}
        options={narrow ? [] : options}
        onViewChange={(next) => updateParams({ view: next })}
        status={statusFilter}
        onStatusChange={(next) =>
          updateParams({ status: next === ALL_STATUSES ? null : next })
        }
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
        clinic={
          manyClinics
            ? {
                value: scope.mode === "clinic" ? scope.clinicId : "",
                options: (clinics.data ?? [])
                  .filter(
                    (c) =>
                      baseScope.mode === "clinic" &&
                      baseScope.clinicIds.includes(c.id),
                  )
                  .map((c) => ({ id: c.id, name: c.name })),
                onChange: setClinicChoice,
              }
            : undefined
        }
        canWrite={canWrite}
        onCreate={() => schedule.form.openCreate()}
        canBook={canBook}
        onBook={() => openBooking(null)}
      />

      {narrow && !isPatient && selectedDate && (
        <div className="mt-3">
          <WeekStrip
            days={weekDays(selectedDate)}
            todayKey={todayKey}
            selectedKey={selectedDate}
            onSelect={selectDay}
          />
        </div>
      )}

      <div className="mt-4">{body}</div>

      {canWrite && (
        <>
          <AppointmentFormDialog
            open={schedule.form.open}
            onOpenChange={schedule.form.onOpenChange}
            appointment={schedule.form.editing}
            onSave={schedule.save}
            defaultDateTime={
              selectedDate && clinic
                ? `${selectedDate}T${clock24(clinic.opening)}`
                : undefined
            }
            defaultPatientId={schedule.form.patientId}
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

      {canBook && (
        <>
          <DoctorPickerDialog
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            onPick={pickDoctor}
          />
          <DoctorBookingDialogs gate={gate} returnTo={BOOK_RETURN} />
        </>
      )}

      <ConfirmActionDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={
          pending?.action === "complete"
            ? "Mark this visit as completed?"
            : "Accept this request?"
        }
        description={
          pending ? (
            <>
              <Text as="p" size="2" mb="2">
                {pending.item.patientName} ·{" "}
                {timeSpan(pending.item.appointmentDateTime, duration)}
              </Text>
              {showAllergy &&
                severityLevel(pending.item.patientHighestAllergySeverity) ===
                  "SEVERE" && (
                  <Text
                    as="p"
                    size="2"
                    weight="bold"
                    style={{ color: "#c53030" }}
                  >
                    {pending.item.patientName} has a SEVERE allergy on record.
                    Check before the visit.
                  </Text>
                )}
            </>
          ) : (
            ""
          )
        }
        confirmLabel={pending ? ACTION_LABEL[pending.action] : "Confirm"}
        onConfirm={() => {
          if (pending) actions.run(pending.item, pending.action);
          setPending(null);
        }}
      />
    </>
  );
}
