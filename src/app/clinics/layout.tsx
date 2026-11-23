import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Clinics · Clinic Admin" };

export default function ClinicsLayout({ children }: { children: ReactNode }) {
  return children;
}
