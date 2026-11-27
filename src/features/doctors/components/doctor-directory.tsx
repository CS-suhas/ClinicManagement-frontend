"use client";

import { Heading, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AsyncContent } from "@/components/async-content";
import { PublicNavbar } from "@/components/public-navbar";
import { SearchField } from "@/components/search-field";
import { useAllClinics } from "@/features/clinics/api";
import { getErrorMessage } from "@/lib/errors";
import { useDirectory } from "../api";
import { DoctorBookingDialogs } from "./doctor-booking-dialogs";
import {
  DEFAULT_FILTERS,
  DoctorFilters,
  type DoctorFilterValues,
} from "./doctor-filters";
import { DoctorList } from "./doctor-list";
import { type DoctorProfile, toDoctorProfile } from "./doctor-profile";
import { filterDoctors, specialtyOptions } from "./filter-doctors";
import { useBookingGate } from "./use-booking-gate";

function directoryHref(clinicId: string, query: string, specialty: string) {
  const params = new URLSearchParams();
  if (clinicId) params.set("clinicId", clinicId);
  if (query.trim()) params.set("q", query.trim());
  if (specialty) params.set("specialty", specialty);
  const search = params.toString();
  return search ? `/doctors?${search}` : "/doctors";
}

export function DoctorDirectoryPage() {
  return (
    <Suspense fallback={null}>
      <DoctorDirectory />
    </Suspense>
  );
}

function DoctorDirectory() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clinicId = searchParams.get("clinicId") ?? "";
  const gate = useBookingGate();

  const [filters, setFilters] = useState<DoctorFilterValues>(() => ({
    ...DEFAULT_FILTERS,
    specialty: searchParams.get("specialty") ?? "",
  }));
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");

  const returnTo = directoryHref(clinicId, query, filters.specialty);

  useEffect(() => {
    const current = window.location.pathname + window.location.search;
    if (current !== returnTo) window.history.replaceState(null, "", returnTo);
  }, [returnTo]);

  const clinics = useAllClinics();
  const directory = useDirectory(clinicId);

  const clinicList = clinics.data ?? [];
  const clinicById = new Map(clinicList.map((c) => [c.id, c]));
  const loadError = directory.error ?? clinics.error;
  const data =
    directory.data && clinics.data
      ? {
          clinicName: clinicId
            ? (clinicById.get(clinicId)?.name ?? null)
            : null,
          doctors: directory.data.items.map((p) =>
            toDoctorProfile(p, clinicById.get(p.clinicId)),
          ),
        }
      : undefined;

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
            clinics={clinicList}
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
            loading={directory.isPending || clinics.isPending}
            error={loadError ? getErrorMessage(loadError) : null}
            isEmpty={!data}
            onRetry={() => {
              void directory.refetch();
              void clinics.refetch();
            }}
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
