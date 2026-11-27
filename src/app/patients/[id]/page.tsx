"use client";

import { use } from "react";
import { PatientDetailPage } from "@/features/patient-detail/components/patient-detail-page";

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { id } = use(params);
  const { tab } = use(searchParams);
  return <PatientDetailPage patientId={id} tab={tab} />;
}
