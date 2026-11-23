import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Patient · MediPulse Life" };

export default function PatientDetailLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
