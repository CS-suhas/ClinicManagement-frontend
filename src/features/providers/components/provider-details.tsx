"use client";

import { Flex, Text } from "@radix-ui/themes";
import {
  GlanceError,
  GlanceSkeleton,
} from "@/components/glance/glance-popover";
import { StatusPill } from "@/components/glance/status-chip";
import { RelativeTime } from "@/components/ui/relative-time";
import { useService } from "@/di/container-provider";
import type { Provider } from "@/domain/entities";
import type { ProviderSummary, VisitFact } from "@/domain/repositories/glance";
import { useGlanceData } from "@/hooks/use-glance-data";
import { formatFee } from "@/lib/format";

const heading = "mb-2 text-[12px] font-semibold uppercase tracking-wide";

/** Expanded row of a provider: clinic contact, today's load and the next five appointments. Staff only. */
export function ProviderDetails({ provider }: { provider: Provider }) {
  const glance = useService("glanceService");
  const summary = useGlanceData<ProviderSummary>(
    `provider:${provider.id}`,
    () => glance.getProviderSummary(provider.id),
  );
  const upcoming = useGlanceData<VisitFact[]>(
    `provider-upcoming:${provider.id}`,
    () => glance.getProviderUpcoming(provider.id, 5),
  );
  const clinic = summary.data?.clinic;
  const slots = summary.data?.todaySlots;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section>
        <h3 className={heading} style={{ color: "var(--mp-muted)" }}>
          Clinic
        </h3>
        {summary.error && (
          <GlanceError message={summary.error} onRetry={summary.retry} />
        )}
        {!summary.error && summary.loading && !summary.data && (
          <GlanceSkeleton rows={2} />
        )}
        {summary.data && (
          <Flex direction="column" gap="1">
            <Text size="2" weight="medium" style={{ color: "var(--mp-ink)" }}>
              {clinic?.name ?? "Clinic details unavailable"}
            </Text>
            {clinic?.location && (
              <Text size="2" style={{ color: "var(--mp-muted)" }}>
                {clinic.location}
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
        {upcoming.error && (
          <GlanceError message={upcoming.error} onRetry={upcoming.retry} />
        )}
        {!upcoming.error && upcoming.loading && !upcoming.data && (
          <GlanceSkeleton rows={3} />
        )}
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
