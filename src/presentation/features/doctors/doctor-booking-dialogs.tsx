"use client";

import { Suspense } from "react";
import { BookingAccessDialog } from "./booking-access-dialog";
import { BookingDetailsDialog } from "./booking-details-dialog";
import { BookingDialog } from "./booking-dialog";
import type { BookingGate } from "./use-booking-gate";

/** The three steps of booking (slot, details, access notice). Render once per page. */
export function DoctorBookingDialogs({
  gate,
  returnTo = "/doctors",
}: {
  gate: BookingGate;
  /** Where onboarding sends a non-patient after creating a profile. */
  returnTo?: string;
}) {
  const { booking, accessOpen, setAccessOpen, user } = gate;
  return (
    <>
      {/* Suspense keeps "today" from being frozen at build time. */}
      <Suspense>
        <BookingDialog
          doctor={booking.slotDoctor}
          settings={booking.settings}
          dateKey={booking.dateKey}
          onDateChange={booking.setDateKey}
          bookedStarts={booking.bookedStarts}
          onOpenChange={(open) => !open && booking.cancelSlotPicking()}
          onContinue={booking.chooseSlot}
        />
      </Suspense>
      <BookingAccessDialog
        open={accessOpen}
        onOpenChange={setAccessOpen}
        displayName={user?.displayName ?? ""}
        canCreateProfile={user !== null && user.patient === null}
        returnTo={returnTo}
      />
      <BookingDetailsDialog
        choice={booking.choice}
        patient={booking.patient}
        patientError={booking.patientError}
        confirmed={booking.confirmed}
        submitting={booking.submitting}
        formError={booking.formError}
        onBack={booking.backToSlots}
        onSubmit={booking.confirm}
        onDone={booking.finish}
      />
    </>
  );
}
