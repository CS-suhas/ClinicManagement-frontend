import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Patients · Clinic Admin" };

export default function PatientsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
