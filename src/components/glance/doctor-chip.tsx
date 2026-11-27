"use client";

import { Button, Flex, Text } from "@radix-ui/themes";
import { useState } from "react";
import { useNotify } from "@/components/notifications";
import { Chip } from "@/components/ui/chip";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { RelativeTime } from "@/components/ui/relative-time";
import { useService } from "@/di/container-provider";
import { providerFullName } from "@/domain/entities";
import type { ProviderSummary } from "@/domain/repositories/glance";
import { useAuth } from "@/features/auth/auth-provider";
import { invalidateGlanceData, useGlanceData } from "@/hooks/use-glance-data";
import { getErrorMessage } from "@/lib/errors";
import { formatFee } from "@/lib/format";
import {
  GlanceAction,
  GlanceError,
  GlanceFooter,
  GlanceHeader,
  GlancePopover,
  GlanceSection,
  GlanceSkeleton,
} from "./glance-popover";
import { StatusPill } from "./status-chip";

export type DoctorChipProps = {
  provider: {
    id: string;
    firstName: string;
    lastName: string;
    specialty?: string;
    clinicId?: string;
    clinicName?: string | null;
    fee?: number | null;
  };
  showSpecialty?: boolean;
  variant?: "chip" | "inline";
};

export function doctorShortName(provider: {
  firstName: string;
  lastName: string;
}) {
  const initial = provider.firstName.trim().charAt(0);
  return initial
    ? `Dr. ${initial}. ${provider.lastName.trim()}`
    : `Dr. ${provider.lastName.trim()}`;
}

export function DoctorChip({
  provider,
  showSpecialty = false,
  variant = "chip",
}: DoctorChipProps) {
  const short = doctorShortName(provider);
  const full = providerFullName(provider);
  const specialtySuffix =
    showSpecialty && provider.specialty ? ` · ${provider.specialty}` : "";
  return (
    <GlancePopover
      label={`${full}, show details`}
      width={320}
      trigger={
        <Chip
          variant={variant}
          leading={<PersonAvatar name={full} size={18} />}
        >
          {short}
          {specialtySuffix}
        </Chip>
      }
    >
      {({ open }) => <DoctorCard provider={provider} open={open} />}
    </GlancePopover>
  );
}

function DoctorCard({
  provider,
  open,
}: {
  provider: DoctorChipProps["provider"];
  open: boolean;
}) {
  const glance = useService("glanceService");
  const providerService = useService("providerService");
  const { user } = useAuth();
  const { notifySuccess, notifyError } = useNotify();
  const [busy, setBusy] = useState(false);
  const summaryState = useGlanceData<ProviderSummary>(
    `provider:${provider.id}`,
    () => glance.getProviderSummary(provider.id),
    open,
  );
  const summary = summaryState.data;
  const details = summary?.provider ?? null;
  const full = providerFullName(provider);
  const status = details?.verificationStatus;
  const fee = details?.fee ?? provider.fee;
  const clinicName = summary?.clinic?.name ?? provider.clinicName ?? null;
  const isAdmin = !!user?.roles.includes("admin");
  const slots = summary?.todaySlots ?? null;
  const loadPercent =
    slots && slots.total > 0
      ? Math.min(100, Math.round((slots.busy / slots.total) * 100))
      : 0;

  const decide = async (action: "verify" | "reject") => {
    setBusy(true);
    try {
      if (action === "verify") {
        await providerService.verify(provider.id);
        notifySuccess(`${full} verified`);
      } else {
        await providerService.reject(provider.id);
        notifySuccess(`${full} rejected`);
      }
      invalidateGlanceData();
      summaryState.retry();
    } catch (e) {
      notifyError(`Could not ${action} ${full}: ${getErrorMessage(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <GlanceHeader
        avatar={<PersonAvatar name={full} size={44} />}
        title={`Dr. ${provider.firstName} ${provider.lastName}`}
        subtitle={provider.specialty}
      />

      <GlanceSection>
        <Flex direction="column" gap="2">
          {status && <StatusPill kind="verification" status={status} />}
          {clinicName && (
            <Text size="2" style={{ color: "var(--mp-ink)" }}>
              {clinicName}
            </Text>
          )}
          {fee !== undefined && (
            <Text size="2" style={{ color: "var(--mp-ink)" }}>
              Fee {formatFee(fee)}
            </Text>
          )}
        </Flex>
      </GlanceSection>

      {summaryState.error && !summary && (
        <GlanceSection>
          <GlanceError
            message={summaryState.error}
            onRetry={summaryState.retry}
          />
        </GlanceSection>
      )}
      {summaryState.loading && !summary && (
        <GlanceSection>
          <GlanceSkeleton rows={2} />
        </GlanceSection>
      )}

      {summary && (summary.nextAvailableStart || slots) && (
        <GlanceSection title="Availability">
          <Flex direction="column" gap="2">
            {summary.nextAvailableStart ? (
              <Text size="2" style={{ color: "var(--mp-ink)" }}>
                Next free: <RelativeTime iso={summary.nextAvailableStart} />
              </Text>
            ) : (
              slots && (
                <Text size="2" style={{ color: "var(--mp-muted)" }}>
                  No free slots this week
                </Text>
              )
            )}
            {slots && (
              <div>
                <Text size="1" style={{ color: "var(--mp-muted)" }}>
                  Today {slots.busy} of {slots.total} slots booked
                </Text>
                <div
                  className="mt-1 h-1 w-full overflow-hidden rounded-full"
                  style={{ background: "var(--mp-paper-deep)" }}
                  aria-hidden="true"
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${loadPercent}%`,
                      background: "var(--mp-primary)",
                    }}
                  />
                </div>
              </div>
            )}
          </Flex>
        </GlanceSection>
      )}

      {summary &&
        (summary.todayAppointmentCount !== null ||
          summary.patientCount !== null) && (
          <GlanceSection>
            <Text size="2" style={{ color: "var(--mp-ink)" }}>
              {summary.todayAppointmentCount !== null &&
                `${summary.todayAppointmentCount} appointment${summary.todayAppointmentCount === 1 ? "" : "s"} today`}
              {summary.todayAppointmentCount !== null &&
                summary.patientCount !== null &&
                " · "}
              {summary.patientCount !== null &&
                `${summary.patientCount} patient${summary.patientCount === 1 ? "" : "s"}`}
            </Text>
          </GlanceSection>
        )}

      <GlanceFooter>
        <GlanceAction href={`/doctors/${provider.id}?book=1`} primary>
          Book
        </GlanceAction>
        <GlanceAction href={`/doctors/${provider.id}`}>
          View doctor
        </GlanceAction>
        {isAdmin && status === "PENDING" && (
          <>
            <Button
              size="2"
              color="teal"
              loading={busy}
              onClick={() => void decide("verify")}
            >
              Verify
            </Button>
            <Button
              size="2"
              color="red"
              variant="soft"
              disabled={busy}
              onClick={() => void decide("reject")}
            >
              Reject
            </Button>
          </>
        )}
      </GlanceFooter>
    </>
  );
}
