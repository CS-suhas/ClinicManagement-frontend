"use client";

import { Flex, Text } from "@radix-ui/themes";
import {
  GlanceError,
  GlanceSkeleton,
} from "@/components/glance/glance-popover";
import { StatusPill } from "@/components/glance/status-chip";
import { RelativeTime } from "@/components/ui/relative-time";
import { useCanViewProviderSchedule } from "@/features/doctors/api";
import { getErrorMessage } from "@/lib/errors";
import { formatFee } from "@/lib/format";
import { useProviderPanel, useProviderUpcoming } from "../api";
import type { Provider } from "../schemas";

const heading = "mb-2 text-[12px] font-semibold uppercase tracking-wide";

export function ProviderDetails({ provider }: { provider: Provider }) {
  const canSeeUpcoming = useCanViewProviderSchedule(provider.id);
  const summary = useProviderPanel(provider.id);
  const upcoming = useProviderUpcoming(provider.id, canSeeUpcoming);
  const clinic = summary.data?.clinic;
  const slots = summary.data?.todaySlots;
  const summaryError = summary.error ? getErrorMessage(summary.error) : null;
  const upcomingError = upcoming.error ? getErrorMessage(upcoming.error) : null;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section>
        <h3 className={heading} style={{ color: "var(--mp-muted)" }}>
          Clinic
        </h3>
        {summaryError && (
          <GlanceError
            message={summaryError}
            onRetry={() => void summary.refetch()}
          />
        )}
        {!summaryError && summary.isPending && <GlanceSkeleton rows={2} />}
        {summary.data && (
          <Flex direction="column" gap="1">
            <Text size="2" weight="medium" style={{ color: "var(--mp-ink)" }}>
              {clinic?.name ?? "Clinic details unavailable"}
            </Text>
            {clinic?.address && (
              <Text size="2" style={{ color: "var(--mp-muted)" }}>
                {clinic.address}
              </Text>
            )}
            {clinic?.phoneNumber && (
              <Text size="2" style={{ color: "var(--mp-muted)" }}>
                {clinic.phoneNumber}
              </Text>
            )}
            {slots && (
              <Text
                size="2"
                className="mt-2"
                style={{ color: "var(--mp-ink)" }}
              >
                Today {slots.busy} of {slots.total} slots booked
                {summary.data.nextAvailableStart && (
                  <>
                    {" "}
                    · next free{" "}
                    <RelativeTime iso={summary.data.nextAvailableStart} />
                  </>
                )}
              </Text>
            )}
            <Text size="2" style={{ color: "var(--mp-muted)" }}>
              Fee {formatFee(provider.fee)}
            </Text>
          </Flex>
        )}
      </section>

      <section>
        <h3 className={heading} style={{ color: "var(--mp-muted)" }}>
          Next appointments
        </h3>
        {upcomingError && (
          <GlanceError
            message={upcomingError}
            onRetry={() => void upcoming.refetch()}
          />
        )}
        {!upcomingError && upcoming.isLoading && <GlanceSkeleton rows={3} />}
        {upcoming.data && upcoming.data.length === 0 && (
          <Text size="2" style={{ color: "var(--mp-muted)" }}>
            No upcoming appointments.
          </Text>
        )}
        {upcoming.data && upcoming.data.length > 0 && (
          <ul className="flex flex-col gap-2">
            {upcoming.data.map((visit) => (
              <li
                key={visit.id}
                className="flex flex-wrap items-center gap-2 text-[13px]"
              >
                <RelativeTime iso={visit.appointmentDateTime} style="short" />
                <span style={{ color: "var(--mp-ink)" }}>
                  {visit.patientName}
                </span>
                <StatusPill kind="appointment" status={visit.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
