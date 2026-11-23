"use client";

import { HomeIcon } from "@radix-ui/react-icons";
import { Button, Flex, Text } from "@radix-ui/themes";
import { useState } from "react";
import { useService } from "@/di/container-provider";
import type { ClinicSummary } from "@/domain/repositories/glance";
import { useGlanceData } from "../../hooks/use-glance-data";
import { getErrorMessage } from "../../lib/errors";
import { useNotify } from "../notifications";
import { AvatarStack } from "../ui/avatar-stack";
import { Chip } from "../ui/chip";
import { IconCircle } from "../ui/icon-circle";
import {
  GlanceAction,
  GlanceError,
  GlanceFooter,
  GlanceHeader,
  GlancePopover,
  GlanceSection,
  GlanceSkeleton,
} from "./glance-popover";

export interface ClinicChipProps {
  clinic: { id: string; name: string };
  /**
   * The signed-in doctor's provider id when they are verified and not yet at a
   * clinic. The card then offers "Request to join" for this clinic.
   */
  joinAs?: string;
  variant?: "chip" | "inline";
}

/** A clinic as a house icon and name. The card shows its address, phone, doctors and today's load. */
export function ClinicChip({
  clinic,
  joinAs,
  variant = "chip",
}: ClinicChipProps) {
  return (
    <GlancePopover
      label={`Clinic ${clinic.name}, show details`}
      width={320}
      trigger={
        <Chip
          variant={variant}
          leading={
            <IconCircle size={18}>
              <HomeIcon width={11} height={11} />
            </IconCircle>
          }
        >
          {clinic.name}
        </Chip>
      }
    >
      {({ open }) => <ClinicCard clinic={clinic} joinAs={joinAs} open={open} />}
    </GlancePopover>
  );
}

function ClinicCard({
  clinic,
  joinAs,
  open,
}: {
  clinic: { id: string; name: string };
  joinAs?: string;
  open: boolean;
}) {
  const glance = useService("glanceService");
  const clinicJoins = useService("clinicJoinService");
  const { notifySuccess, notifyError } = useNotify();
  const [requesting, setRequesting] = useState(false);
  const summaryState = useGlanceData<ClinicSummary>(
    `clinic:${clinic.id}`,
    () => glance.getClinicSummary(clinic.id),
    open,
  );
  const summary = summaryState.data;
  const address = summary?.clinic?.location ?? null;
  const phone = summary?.clinic?.phoneNumber ?? "";

  const requestJoin = async () => {
    if (!joinAs) return;
    setRequesting(true);
    try {
      await clinicJoins.createForProvider(joinAs, clinic.id);
      notifySuccess(`Request sent to ${clinic.name}`);
      summaryState.retry();
    } catch (e) {
      notifyError(
        `Could not request to join ${clinic.name}: ${getErrorMessage(e)}`,
      );
    } finally {
      setRequesting(false);
    }
  };

  return (
    <>
      <GlanceHeader
        avatar={
          <IconCircle size={44}>
            <HomeIcon width={20} height={20} />
          </IconCircle>
        }
        title={clinic.name}
        subtitle={address ?? undefined}
      />

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
          <GlanceSkeleton rows={3} />
        </GlanceSection>
      )}

      {summary && (
        <>
          <GlanceSection>
            <Flex direction="column" gap="1">
              {address && (
                <Text size="2" style={{ color: "var(--mp-ink)" }}>
                  {address}
                </Text>
              )}
              {phone && (
                <Text size="2" style={{ color: "var(--mp-muted)" }}>
                  {phone}
                </Text>
              )}
            </Flex>
          </GlanceSection>

          <GlanceSection>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Doctors" value={String(summary.providerCount)} />
              <Stat
                label="Today"
                value={
                  summary.todayAppointmentCount === null
                    ? "—"
                    : String(summary.todayAppointmentCount)
                }
              />
              {summary.pendingJoinRequestCount !== null && (
                <Stat
                  label="Pending joins"
                  value={String(summary.pendingJoinRequestCount)}
                />
              )}
            </div>
          </GlanceSection>

          {summary.providers.length > 0 && (
            <GlanceSection title="Doctors">
              <Flex align="center" gap="3" wrap="wrap">
                <AvatarStack
                  max={5}
                  people={summary.providers.map((p) => ({
                    name: `${p.firstName} ${p.lastName}`,
                  }))}
                />
                {summary.topSpecialties.length > 0 && (
                  <Flex gap="1" wrap="wrap">
                    {summary.topSpecialties.map((s) => (
                      <span
                        key={s.specialty}
                        className="rounded-full px-2 py-0.5 text-[12px]"
                        style={{
                          background: "var(--mp-paper)",
                          color: "var(--mp-muted)",
                        }}
                      >
                        {s.specialty}
                      </span>
                    ))}
                  </Flex>
                )}
              </Flex>
            </GlanceSection>
          )}
        </>
      )}

      <GlanceFooter>
        {joinAs && (
          <Button
            size="2"
            color="teal"
            loading={requesting}
            onClick={() => void requestJoin()}
          >
            Request to join
          </Button>
        )}
        <GlanceAction href={`/clinics/${clinic.id}`} primary={!joinAs}>
          View clinic
        </GlanceAction>
        <GlanceAction href={`/doctors?clinicId=${clinic.id}`}>
          Find a doctor here
        </GlanceAction>
        <GlanceAction
          href={phone ? `tel:${phone}` : null}
          disabledReason="No phone on file"
        >
          Call
        </GlanceAction>
        {address && (
          <GlanceAction
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${clinic.name} ${address}`)}`}
            external
          >
            Open in Maps
          </GlanceAction>
        )}
      </GlanceFooter>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl px-2 py-2"
      style={{ background: "var(--mp-paper)" }}
    >
      <Text as="p" size="4" weight="bold" style={{ color: "var(--mp-ink)" }}>
        {value}
      </Text>
      <Text as="p" size="1" style={{ color: "var(--mp-muted)" }}>
        {label}
      </Text>
    </div>
  );
}
