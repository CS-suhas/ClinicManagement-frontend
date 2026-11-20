import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Appointments · Clinic Admin" };

export default function AppointmentsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
