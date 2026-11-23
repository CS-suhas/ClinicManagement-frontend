"use client";

import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ListBulletIcon,
  PersonIcon,
  PlusIcon,
  ViewGridIcon,
  ViewHorizontalIcon,
} from "@radix-ui/react-icons";
import { Button, IconButton, Select, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";
import {
  APPOINTMENT_STATUSES,
  type AppointmentStatus,
} from "@/domain/entities";
import { statusPresentation } from "@/presentation/components/glance";
import { SegmentedToggle } from "@/presentation/components/ui/segmented-toggle";
import { Surface } from "@/presentation/components/ui/surface";
import type { AppointmentView } from "./schedule-time";

export const ALL_STATUSES = "all" as const;
export type StatusFilter = typeof ALL_STATUSES | AppointmentStatus;

/** Which views a role gets. Patients get the month grid, doctors the day and week grids, staff the day grid. */
export function viewOptions(
  role: "patient" | "doctor" | "staff",
): { value: AppointmentView; label: string; icon: ReactNode }[] {
  const month = {
    value: "month" as const,
    label: "Month view",
    icon: <CalendarIcon />,
  };
  const day = {
    value: "day" as const,
    label: "Day view",
    icon: <ViewHorizontalIcon />,
  };
  const week = {
    value: "week" as const,
    label: "Week view",
    icon: <ViewGridIcon />,
  };
  const list = {
    value: "list" as const,
    label: "List view",
    icon: <ListBulletIcon />,
  };
  if (role === "patient") return [month, list];
  if (role === "doctor") return [day, week, list];
  return [day, list];
}

export function AppointmentToolbar({
  ready,
  navLabel,
  onToday,
  onPrevious,
  onNext,
  view,
  options,
  onViewChange,
  status,
  onStatusChange,
  provider,
  clinic,
  canWrite,
  onCreate,
  canBook,
  onBook,
}: {
  /** False until the current day is known (after mount). */
  ready: boolean;
  navLabel: string;
  onToday: () => void;
  onPrevious: () => void;
  onNext: () => void;
  view: AppointmentView;
  options: { value: AppointmentView; label: string; icon: ReactNode }[];
  onViewChange: (view: AppointmentView) => void;
  status: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  /** Doctor filter for admins. */
  provider?: {
    value: string;
    options: { id: string; name: string }[];
    onChange: (id: string) => void;
  };
  /** Clinic picker for clinic admins of several clinics. */
  clinic?: {
    value: string;
    options: { id: string; name: string }[];
    onChange: (id: string) => void;
  };
  canWrite: boolean;
  onCreate: () => void;
  canBook: boolean;
  onBook: () => void;
}) {
  return (
    <Surface padding="sm" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="soft"
            color="teal"
            onClick={onToday}
            disabled={!ready}
          >
            Today
          </Button>
          <IconButton
            variant="ghost"
            color="gray"
            aria-label="Previous"
            onClick={onPrevious}
            disabled={!ready}
          >
            <ChevronLeftIcon />
          </IconButton>
          <IconButton
            variant="ghost"
            color="gray"
            aria-label="Next"
            onClick={onNext}
            disabled={!ready}
          >
            <ChevronRightIcon />
          </IconButton>
          <Text
            as="p"
            weight="bold"
            size="3"
            className="ml-1"
            style={{ color: "var(--mp-ink)" }}
            aria-live="polite"
          >
            {navLabel}
          </Text>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canBook && (
            <Button color="teal" onClick={onBook}>
              <PersonIcon /> Book appointment
            </Button>
          )}
          {canWrite && (
            <Button color="teal" onClick={onCreate} disabled={!ready}>
              <PlusIcon /> New appointment
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {options.length > 1 && (
          <SegmentedToggle<AppointmentView>
            ariaLabel="View mode"
            value={view}
            onChange={onViewChange}
            options={options}
          />
        )}
        <Select.Root
          value={status}
          onValueChange={(value) => onStatusChange(value as StatusFilter)}
        >
          <Select.Trigger aria-label="Filter by status" />
          <Select.Content>
            <Select.Item value={ALL_STATUSES}>All statuses</Select.Item>
            {APPOINTMENT_STATUSES.map((value) => (
              <Select.Item key={value} value={value}>
                {statusPresentation("appointment", value).label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        {provider && (
          <Select.Root value={provider.value} onValueChange={provider.onChange}>
            <Select.Trigger aria-label="Filter by doctor" />
            <Select.Content>
              <Select.Item value="all">All doctors</Select.Item>
              {provider.options.map((option) => (
                <Select.Item key={option.id} value={option.id}>
                  {option.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        )}
        {clinic && clinic.options.length > 1 && (
          <Select.Root value={clinic.value} onValueChange={clinic.onChange}>
            <Select.Trigger aria-label="Choose clinic" />
            <Select.Content>
              {clinic.options.map((option) => (
                <Select.Item key={option.id} value={option.id}>
                  {option.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        )}
      </div>
    </Surface>
  );
}
