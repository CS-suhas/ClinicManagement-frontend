"use client";

import { Heading } from "@radix-ui/themes";
import { Suspense, useMemo, useState } from "react";
import { useService } from "@/di/container-provider";
import { AsyncContent } from "@/presentation/components/async-content";
import { PublicNavbar } from "@/presentation/components/public-navbar";
import { SearchField } from "@/presentation/components/search-field";
import { BookingDetailsDialog } from "@/presentation/features/doctors/booking-details-dialog";
import { BookingDialog } from "@/presentation/features/doctors/booking-dialog";
import {
  DEFAULT_FILTERS,
  DoctorFilters,
  type DoctorFilterValues,
} from "@/presentation/features/doctors/doctor-filters";
import { DoctorList } from "@/presentation/features/doctors/doctor-list";
import { toDoctorProfile } from "@/presentation/features/doctors/doctor-profile";
import { filterDoctors } from "@/presentation/features/doctors/filter-doctors";
import { useDoctorBooking } from "@/presentation/features/doctors/use-doctor-booking";
import { useAsyncData } from "@/presentation/hooks/use-async-data";

export default function DoctorsPage() {
  const providerService = useService("providerService");
  const clinicService = useService("clinicService");
  const booking = useDoctorBooking();
  const [filters, setFilters] = useState<DoctorFilterValues>(DEFAULT_FILTERS);
  const [query, setQuery] = useState("");

  const { data, loading, error, reload } = useAsyncData(async () => {
    const [providers, clinics] = await Promise.all([
      providerService.list(),
      clinicService.list(),
    ]);
    const clinicById = new Map(clinics.map((c) => [c.id, c]));
    return providers.map((p) => toDoctorProfile(p, clinicById.get(p.clinicId)));
  });

  const doctors = useMemo(
    () => filterDoctors(data ?? [], filters, query),
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
          <Heading as="h1" size="6" mb="4" style={{ color: "var(--mp-ink)" }}>
            Find doctors
          </Heading>
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
            <DoctorList doctors={doctors} onBook={booking.startBooking} />
          </AsyncContent>
        </div>
      </main>

      {/* Suspense keeps "today" from being frozen at build time. */}
      <Suspense>
        <BookingDialog
          doctor={booking.slotDoctor}
          settings={booking.settings}
          bookedStarts={booking.bookedStarts}
          onOpenChange={(open) => !open && booking.cancelSlotPicking()}
          onContinue={booking.chooseSlot}
        />
      </Suspense>
      <BookingDetailsDialog
        choice={booking.choice}
        confirmed={booking.confirmed}
        submitting={booking.submitting}
        fieldErrors={booking.fieldErrors}
        formError={booking.formError}
        onBack={booking.backToSlots}
        onSubmit={booking.confirm}
        onDone={booking.finish}
      />
    </div>
  );
}
