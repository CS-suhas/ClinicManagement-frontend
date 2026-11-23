"use client";

import { Heading, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
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
import { filterDoctors } from "@/presentation/features/doctors/filter-doctors";
import { useBookingGate } from "@/presentation/features/doctors/use-booking-gate";
import { useAsyncData } from "@/presentation/hooks/use-async-data";

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
  const searchParams = useSearchParams();
  const clinicId = searchParams.get("clinicId") ?? "";
  const gate = useBookingGate();

  const [filters, setFilters] = useState<DoctorFilterValues>(DEFAULT_FILTERS);
  const [query, setQuery] = useState("");

  /** Where sign-in returns the visitor, keeping the clinic filter. */
  const returnTo = clinicId
    ? `/doctors?clinicId=${encodeURIComponent(clinicId)}`
    : "/doctors";

  const { data, loading, error, reload } = useAsyncData(async () => {
    // The directory holds only bookable doctors: verified, and in a clinic.
    const [directory, clinics] = await Promise.all([
      providerService.directory({
        page: 1,
        pageSize: 100,
        clinicId: clinicId || undefined,
      }),
      clinicService.list(),
    ]);
    const clinicById = new Map(clinics.map((c) => [c.id, c]));
    return {
      clinicName: clinicId ? (clinicById.get(clinicId)?.name ?? null) : null,
      doctors: directory.items.map((p) =>
        toDoctorProfile(p, clinicById.get(p.clinicId)),
      ),
    };
  }, clinicId);

  const doctors = useMemo(
    () => filterDoctors(data?.doctors ?? [], filters, query),
    [data, filters, query],
  );

  return (
    <div className="min-h-screen" style={{ background: "#f3f8f7" }}>
      <PublicNavbar
        crumbs={[{ label: "Home", href: "/" }, { label: "Find doctors" }]}
      />

      <main className="grid gap-8 px-6 py-8 md:px-12 lg:grid-cols-[260px_1fr]">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <DoctorFilters values={filters} onChange={setFilters} />
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
