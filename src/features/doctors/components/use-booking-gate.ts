"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { canBookOnline } from "@/application/auth/permissions";
import { useAuth } from "@/features/auth/auth-provider";
import type { DoctorProfile } from "./doctor-profile";
import { useDoctorBooking } from "./use-doctor-booking";

/**
 * The booking flow plus the auth rules that guard it. Signed-out visitors go to
 * sign-in and come back to `returnTo`; signed-in accounts that are not patients
 * are told why; patients go straight to the slot picker.
 */
export function useBookingGate() {
  const booking = useDoctorBooking();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [accessOpen, setAccessOpen] = useState(false);

  const requestBooking = (doctor: DoctorProfile, returnTo: string) => {
    if (loading) return;
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(returnTo)}`);
      return;
    }
    if (!canBookOnline(user)) {
      setAccessOpen(true);
      return;
    }
    booking.startBooking(doctor);
  };

  return { booking, requestBooking, accessOpen, setAccessOpen, user };
}

export type BookingGate = ReturnType<typeof useBookingGate>;
