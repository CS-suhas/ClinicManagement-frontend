"use client";

import { HomeIcon } from "@radix-ui/react-icons";
import { Button, Flex, Spinner, Text } from "@radix-ui/themes";
import Link from "next/link";
import { ErrorCallout } from "@/components/error-callout";
import { DoctorChip } from "@/components/glance";
import { EmptyState } from "@/components/ui/empty-state";
import { IconCircle } from "@/components/ui/icon-circle";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { useService } from "@/di/container-provider";
import type { ClinicSummary } from "@/domain/repositories/glance";
import { useAsyncData } from "@/hooks/use-async-data";

/** A clinic: its details and stats, specialties, and its doctors. */
export function ClinicDetailView({ clinicId }: { clinicId: string }) {
  const glance = useService("glanceService");
  const summary = useAsyncData<ClinicSummary>(
    () => glance.getClinicSummary(clinicId),
    clinicId,
  );

  if (summary.loading && !summary.data)
    return (
      <Flex justify="center" py="9">
        <Spinner size="3" />
      </Flex>
    );
  if (summary.error)
    return (
      <ErrorCallout
        message={summary.error}
        onRetry={() => void summary.reload()}
      />
    );

  const data = summary.data;
  const clinic = data?.clinic ?? null;
  if (!data || !clinic)
    return (
      <EmptyState
        title="Clinic not found"
        description="This clinic may have been removed, or you cannot see it."
        action={
          <Button asChild variant="soft" color="teal">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        }
      />
    );

  const mapsHref = clinic.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinic.location)}`
    : null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={clinic.name}
        subtitle={clinic.location ?? "No address on record"}
      />

      <Surface padding="lg">
        <Flex gap="4" align="start" wrap="wrap">
          <IconCircle size={48}>
            <HomeIcon width={22} height={22} />
          </IconCircle>
          <Flex direction="column" gap="2" className="min-w-0 flex-1">
            <Flex gap="3" wrap="wrap">
              {clinic.phoneNumber && (
                <Text asChild size="2">
                  <a
                    href={`tel:${clinic.phoneNumber}`}
                    style={{ color: "var(--mp-ink)" }}
                  >
                    {clinic.phoneNumber}
                  </a>
                </Text>
              )}
              {mapsHref && (
                <Text asChild size="2">
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--mp-primary)" }}
                  >
                    Open in Maps
                  </a>
                </Text>
              )}
            </Flex>
            {data.topSpecialties.length > 0 && (
              <Flex gap="2" wrap="wrap" mt="1">
                {data.topSpecialties.map((item) => (
                  <span
                    key={item}
                    className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{
                      background: "var(--mp-primary-tint)",
                      color: "var(--mp-ink)",
                    }}
                  >
                    {item}
                  </span>
                ))}
              </Flex>
            )}
          </Flex>
        </Flex>
      </Surface>

      <dl className="m-0 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Stat label="Verified doctors" value={String(data.providerCount)} />
        <Stat
          label="Appointments today"
          value={
            data.todayAppointmentCount === null
              ? "—"
              : String(data.todayAppointmentCount)
          }
        />
      </dl>

      <section aria-labelledby="clinic-doctors-heading">
        <Flex justify="between" align="center" mb="3" gap="3" wrap="wrap">
          <Text
            id="clinic-doctors-heading"
            size="3"
            weight="bold"
            style={{ color: "var(--mp-ink)" }}
          >
            Doctors
          </Text>
          {data.providerCount > 0 && (
            <Link
              href={`/doctors?clinicId=${clinicId}`}
              className="text-sm font-medium"
              style={{ color: "var(--mp-primary)" }}
            >
              See all doctors here
            </Link>
          )}
        </Flex>
        {data.providers.length === 0 ? (
          <EmptyState
            title="No doctors yet"
            description="Doctors appear here once they are verified and join this clinic."
          />
        ) : (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {data.providers.map((doctor) => (
              <li key={doctor.id}>
                <DoctorChip
                  provider={{
                    id: doctor.id,
                    firstName: doctor.firstName,
                    lastName: doctor.lastName,
                    specialty: doctor.specialty,
                    clinicId,
                    clinicName: clinic.name,
                  }}
                  showSpecialty
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Surface padding="md">
      <dt className="text-xs font-medium" style={{ color: "var(--mp-muted)" }}>
        {label}
      </dt>
      <dd
        className="m-0 mt-1 text-2xl font-semibold tabular-nums"
        style={{ color: "var(--mp-ink)" }}
      >
        {value}
      </dd>
    </Surface>
  );
}
