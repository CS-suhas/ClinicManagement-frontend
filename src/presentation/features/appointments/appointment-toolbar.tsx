"use client";

import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ListBulletIcon,
  PlusIcon,
} from "@radix-ui/react-icons";
import { Button, IconButton, Select, Text } from "@radix-ui/themes";
import { SegmentedToggle } from "@/presentation/components/ui/segmented-toggle";
import { Surface } from "@/presentation/components/ui/surface";
import type { AppointmentView } from "./schedule-time";

export function AppointmentToolbar({
  ready,
  dateLabel,
  onToday,
  onPrevious,
  onNext,
  view,
  onViewChange,
  provider,
  canWrite,
  onCreate,
}: {
  /** False until the current day is known (after mount). */
  ready: boolean;
  dateLabel: string;
  onToday: () => void;
  onPrevious: () => void;
  onNext: () => void;
  view: AppointmentView;
  onViewChange: (view: AppointmentView) => void;
  /** Provider filter for admins; omitted for other roles. */
  provider?: {
    value: string;
    options: { id: string; name: string }[];
    onChange: (id: string) => void;
  };
  canWrite: boolean;
  onCreate: () => void;
}) {
  return (
    <Surface
      padding="sm"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="soft" color="teal" onClick={onToday} disabled={!ready}>
          Today
        </Button>
        <IconButton
          variant="ghost"
          color="gray"
          aria-label="Previous day"
          onClick={onPrevious}
          disabled={!ready}
        >
          <ChevronLeftIcon />
        </IconButton>
        <IconButton
          variant="ghost"
          color="gray"
          aria-label="Next day"
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
          {dateLabel}
        </Text>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {provider && (
          <Select.Root value={provider.value} onValueChange={provider.onChange}>
            <Select.Trigger aria-label="Filter by provider" />
            <Select.Content>
              <Select.Item value="all">All providers</Select.Item>
              {provider.options.map((option) => (
                <Select.Item key={option.id} value={option.id}>
                  {option.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        )}
        <SegmentedToggle<AppointmentView>
          ariaLabel="View mode"
          value={view}
          onChange={onViewChange}
          options={[
            {
              value: "calendar",
              label: "Calendar view",
              icon: <CalendarIcon />,
            },
            { value: "list", label: "List view", icon: <ListBulletIcon /> },
          ]}
        />
        {canWrite && (
          <Button color="teal" onClick={onCreate} disabled={!ready}>
            <PlusIcon /> New appointment
          </Button>
        )}
      </div>
    </Surface>
  );
}
