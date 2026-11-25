"use client";

import { Heading, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useService } from "@/di/container-provider";
import { AsyncContent } from "@/presentation/components/async-content";
import { PublicNavbar } from "@/presentation/components/public-navbar";
import { SearchField } from "@/presentation/components/search-field";
import { DoctorBookingDialogs } from "@/presentation/features/doctors/doctor-booking-dialogs";
import {
  DEFAULT_FILTERS,
  DoctorFilters,
  type DoctorFilterValues,
} from "@/presentation/features/doctors/doctor-filters";
import { DoctorList } from "@/presentation/features/doctors/doctor-list";
import {
  type DoctorProfile,
  toDoctorProfile,
} from "@/presentation/features/doctors/doctor-profile";
import {
  filterDoctors,
  specialtyOptions,
} from "@/presentation/features/doctors/filter-doctors";
import { useBookingGate } from "@/presentation/features/doctors/use-booking-gate";
import { useAsyncData } from "@/presentation/hooks/use-async-data";

/**
 * The directory URL for a clinic, search text and specialty, leaving out empty
 * values so `/doctors` stays clean. Shareable, and kept through sign-in.
 */
function directoryHref(clinicId: string, query: string, specialty: string) {
  const params = new URLSearchParams();
  if (clinicId) params.set("clinicId", clinicId);
  if (query.trim()) params.set("q", query.trim());
  if (specialty) params.set("specialty", specialty);
  const search = params.toString();
  return search ? `/doctors?${search}` : "/doctors";
}

export default function DoctorsPage() {
  // Search params need a Suspense boundary so the page can still prerender.
  return (
    <Suspense fallback={null}>
      <DoctorDirectory />
    </Suspense>
  );
}

function DoctorDirectory() {
  const providerService = useService("providerService");
  const clinicService = useService("clinicService");
  const router = useRouter();
  const searchParams = useSearchParams();
  const clinicId = searchParams.get("clinicId") ?? "";
  const gate = useBookingGate();

  // Search text and specialty start from the URL (e.g. the landing search).
  const [filters, setFilters] = useState<DoctorFilterValues>(() => ({
    ...DEFAULT_FILTERS,
    specialty: searchParams.get("specialty") ?? "",
  }));
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");

  /** Where sign-in returns the visitor, keeping the search and filters. */
  const returnTo = directoryHref(clinicId, query, filters.specialty);

  // Mirror the search and specialty into the URL without a navigation, so the
  // page can be shared or reloaded. The clinic is already in it.
  useEffect(() => {
    const current = window.location.pathname + window.location.search;
    if (current !== returnTo) window.history.replaceState(null, "", returnTo);
  }, [returnTo]);

  // Loaded once, so the clinic filter's options stay put while doctors reload.
  const clinics = useAsyncData(() => clinicService.list());

  const { data, loading, error, reload } = useAsyncData(async () => {
    // The directory holds only bookable doctors: verified, and in a clinic.
    const [directory, clinicList] = await Promise.all([
      providerService.directory({
        page: 1,
        pageSize: 100,
        clinicId: clinicId || undefined,
      }),
      clinicService.list(),
    ]);
    const clinicById = new Map(clinicList.map((c) => [c.id, c]));
    return {
      clinicName: clinicId ? (clinicById.get(clinicId)?.name ?? null) : null,
      doctors: directory.items.map((p) =>
        toDoctorProfile(p, clinicById.get(p.clinicId)),
      ),
    };
  }, clinicId);

  const setClinicId = (id: string) =>
    router.replace(directoryHref(id, query, filters.specialty), {
      scroll: false,
    });

  const doctors = useMemo(
    () => filterDoctors(data?.doctors ?? [], filters, query),
    [data, filters, query],
  );
  const specialties = useMemo(
    () => specialtyOptions(data?.doctors ?? []),
    [data],
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--mp-bg)" }}>
      <PublicNavbar
        crumbs={[{ label: "Home", href: "/" }, { label: "Find doctors" }]}
      />

      <main className="grid gap-8 px-6 py-8 md:px-12 lg:grid-cols-[260px_1fr]">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <DoctorFilters
            values={filters}
            onChange={setFilters}
            clinics={clinics.data ?? []}
            clinicId={clinicId}
            onClinicChange={setClinicId}
            specialties={specialties}
          />
        </div>
        <div className="min-w-0">
          <Heading as="h1" size="6" mb="2" style={{ color: "var(--mp-ink)" }}>
            Find doctors
          </Heading>
          {clinicId && (
            <Text as="p" size="2" mb="4" style={{ color: "var(--mp-muted)" }}>
              Doctors at {data?.clinicName ?? "this clinic"}.{" "}
              <Link
                href="/doctors"
                className="font-semibold"
                style={{ color: "var(--mp-primary)" }}
              >
                Show all doctors
              </Link>
            </Text>
          )}
          <div className="mb-6">
            <SearchField
              size="3"
              fullWidth
              value={query}
              onChange={setQuery}
              placeholder="Search by doctor, specialty or place"
            />
          </div>
          <AsyncContent
            loading={loading}
            error={error}
            isEmpty={!data}
            onRetry={reload}
          >
            <DoctorList
              doctors={doctors}
              onBook={(doctor: DoctorProfile) =>
                gate.requestBooking(doctor, returnTo)
              }
            />
          </AsyncContent>
        </div>
      </main>

      <DoctorBookingDialogs gate={gate} returnTo={returnTo} />
    </div>
  );
}
