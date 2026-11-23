"use client";

import { Button, Flex, Heading, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { useService } from "@/di/container-provider";
import { useAuth } from "@/presentation/auth/auth-provider";
import { AsyncContent } from "@/presentation/components/async-content";
import { ClinicChip } from "@/presentation/components/glance";
import { PublicNavbar } from "@/presentation/components/public-navbar";
import { PersonAvatar } from "@/presentation/components/ui/person-avatar";
import { RelativeTime } from "@/presentation/components/ui/relative-time";
import { Surface } from "@/presentation/components/ui/surface";
import { useAsyncData } from "@/presentation/hooks/use-async-data";
import { formatFee } from "@/presentation/lib/format";
import { DoctorBookingDialogs } from "./doctor-booking-dialogs";
import { useBookableDoctor } from "./use-bookable-doctor";
import { useBookingGate } from "./use-booking-gate";

/**
 * Public doctor page: fee, clinic, the next free slot and a Book button. With
 * `?book=1` the booking flow opens straight away, after the usual sign-in rules.
 */
export function DoctorDetailView({ providerId }: { providerId: string }) {
  return (
    <Suspense fallback={null}>
      <DoctorDetail providerId={providerId} />
    </Suspense>
  );
}

function DoctorDetail({ providerId }: { providerId: string }) {
  const glanceService = useService("glanceService");
  const searchParams = useSearchParams();
  const wantsBooking = searchParams.get("book") === "1";
  const { loading: authLoading } = useAuth();
  const gate = useBookingGate();
  const doctor = useBookableDoctor(providerId);
  const nextFree = useAsyncData(
    () => glanceService.getNextFreeSlot(providerId),
    providerId,
  );

  const returnTo = `/doctors/${providerId}`;
  const bookReturnTo = `/doctors/${providerId}?book=1`;

  // ?book=1 opens the booking flow once the doctor and the session are known.
  const autoOpened = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: opens once per page load.
  useEffect(() => {
    if (!wantsBooking || autoOpened.current || authLoading || !doctor.data)
      return;
    autoOpened.current = true;
    gate.requestBooking(doctor.data, bookReturnTo);
  }, [wantsBooking, authLoading, doctor.data, bookReturnTo]);

  const name = doctor.data?.name ?? "Doctor";

  return (
    <div className="min-h-screen" style={{ background: "#f3f8f7" }}>
      <PublicNavbar
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Find doctors", href: "/doctors" },
          { label: name },
        ]}
      />

      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8 md:px-12">
        <AsyncContent
          loading={doctor.loading}
          error={doctor.error}
          isEmpty={doctor.data === undefined}
          onRetry={doctor.reload}
        >
          {doctor.data === null ? (
            <Surface padding="lg">
              <Text as="p" size="3" weight="medium">
                This doctor is not available to book.
              </Text>
              <Text as="p" size="2" mt="2" style={{ color: "var(--mp-muted)" }}>
                <Link href="/doctors" style={{ color: "var(--mp-primary)" }}>
                  Browse all doctors
                </Link>
              </Text>
            </Surface>
          ) : (
            doctor.data && (
              <Surface padding="lg" as="section" aria-labelledby="doctor-name">
                <Flex align="center" gap="4" wrap="wrap">
                  <PersonAvatar name={doctor.data.name} size={72} />
                  <div className="min-w-0 flex-1">
                    <Heading
                      id="doctor-name"
                      as="h1"
                      size="6"
                      style={{ color: "var(--mp-ink)" }}
                    >
                      {doctor.data.name}
                    </Heading>
                    <Text as="p" size="3" style={{ color: "var(--mp-muted)" }}>
                      {doctor.data.specialties.join(", ")}
                    </Text>
                  </div>
                </Flex>

                <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "var(--mp-muted)" }}
                    >
                      Consultation fee
                    </dt>
                    <dd
                      className="m-0 mt-1 text-base font-semibold tabular-nums"
                      style={{ color: "var(--mp-ink)" }}
                    >
                      {formatFee(doctor.data.consultationFee ?? null)}
                    </dd>
                  </div>
                  <div>
                    <dt
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "var(--mp-muted)" }}
                    >
                      Clinic
                    </dt>
                    <dd className="m-0 mt-1 flex flex-wrap items-center gap-2">
                      {doctor.data.clinicId ? (
                        <>
                          <ClinicChip
                            clinic={{
                              id: doctor.data.clinicId,
                              name: doctor.data.clinicName,
                            }}
                          />
                          <Link
                            href={`/doctors?clinicId=${encodeURIComponent(doctor.data.clinicId)}`}
                            className="text-sm font-semibold"
                            style={{ color: "var(--mp-primary)" }}
                          >
                            Find a doctor here
                          </Link>
                        </>
                      ) : (
                        <Text size="2" style={{ color: "var(--mp-muted)" }}>
                          No clinic listed
                        </Text>
                      )}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "var(--mp-muted)" }}
                    >
                      Next free slot
                    </dt>
                    <dd
                      className="m-0 mt-1 text-base"
                      style={{ color: "var(--mp-ink)" }}
                    >
                      {nextFree.loading && nextFree.data === undefined ? (
                        "Checking availability…"
                      ) : nextFree.data ? (
                        <RelativeTime iso={nextFree.data} />
                      ) : (
                        "No free slot in the next week"
                      )}
                    </dd>
                  </div>
                </dl>

                <div className="sticky bottom-4 mt-6 flex justify-end">
                  <Button
                    size="3"
                    color="teal"
                    disabled={authLoading}
                    onClick={() =>
                      gate.requestBooking(
                        doctor.data as NonNullable<typeof doctor.data>,
                        bookReturnTo,
                      )
                    }
                  >
                    Book appointment
                  </Button>
                </div>
              </Surface>
            )
          )}
        </AsyncContent>
      </main>

      <DoctorBookingDialogs gate={gate} returnTo={returnTo} />
    </div>
  );
}
