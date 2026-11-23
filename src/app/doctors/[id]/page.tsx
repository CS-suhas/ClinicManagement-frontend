"use client";

import { use } from "react";
import { DoctorDetailView } from "@/presentation/features/doctors/doctor-detail-view";

export default function DoctorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <DoctorDetailView providerId={id} />;
}
