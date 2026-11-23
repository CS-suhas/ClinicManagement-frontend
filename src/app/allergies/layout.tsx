import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Allergies · Clinic Admin" };

export default function AllergiesLayout({ children }: { children: ReactNode }) {
  return children;
}
