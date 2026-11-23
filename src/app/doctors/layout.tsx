import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Find doctors · MediPulse Life" };

export default function DoctorsLayout({ children }: { children: ReactNode }) {
  return children;
}
