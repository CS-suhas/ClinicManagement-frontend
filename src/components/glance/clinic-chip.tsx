"use client";

import { HomeIcon } from "@radix-ui/react-icons";
import { Flex, Text } from "@radix-ui/themes";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { Chip } from "@/components/ui/chip";
import { IconCircle } from "@/components/ui/icon-circle";
import { getErrorMessage } from "@/lib/errors";
import { useClinicGlance } from "./api";
import {
  GlanceAction,
  GlanceError,
  GlanceFooter,
  GlanceHeader,
  GlancePopover,
  GlanceSection,
  GlanceSkeleton,
} from "./glance-popover";

export type ClinicChipProps = {
  clinic: { id: string; name: string };
  variant?: "chip" | "inline";
};

export function ClinicChip({ clinic, variant = "chip" }: ClinicChipProps) {
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
      {({ open }) => <ClinicCard clinic={clinic} open={open} />}
    </GlancePopover>
  );
}

function ClinicCard({
  clinic,
  open,
}: {
  clinic: { id: string; name: string };
  open: boolean;
}) {
  const summaryState = useClinicGlance(clinic.id, open);
  const summary = summaryState.data;
  const address = summary?.clinic?.address ?? null;
  const phone = summary?.clinic?.phoneNumber ?? "";

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

      {summaryState.isError && !summary && (
        <GlanceSection>
          <GlanceError
            message={getErrorMessage(summaryState.error)}
            onRetry={() => void summaryState.refetch()}
          />
        </GlanceSection>
      )}
      {summaryState.isLoading && !summary && (
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
            <div className="grid grid-cols-2 gap-2 text-center">
              <Stat label="Doctors" value={String(summary.providerCount)} />
              <Stat
                label="Today"
                value={
                  summary.todayAppointmentCount === null
                    ? "—"
                    : String(summary.todayAppointmentCount)
                }
              />
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
                        key={s}
                        className="rounded-full px-2 py-0.5 text-[12px]"
                        style={{
                          background: "var(--mp-paper)",
                          color: "var(--mp-muted)",
                        }}
                      >
                        {s}
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
        <GlanceAction href={`/clinics/${clinic.id}`} primary>
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
