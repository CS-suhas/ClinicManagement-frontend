import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Providers · Clinic Admin" };

export default function ProvidersLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
