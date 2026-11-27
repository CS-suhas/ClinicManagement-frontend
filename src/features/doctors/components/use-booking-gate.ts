"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import { canBookOnline } from "@/features/auth/permissions";
import type { DoctorProfile } from "./doctor-profile";
import { useDoctorBooking } from "./use-doctor-booking";

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
