"use client";

import { use } from "react";
import { DoctorDetailView } from "@/features/doctors/components/doctor-detail-view";

export default function DoctorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <DoctorDetailView providerId={id} />;
}
