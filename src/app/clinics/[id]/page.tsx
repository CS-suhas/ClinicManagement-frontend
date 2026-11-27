import { ClinicDetailView } from "@/features/clinic-detail/components/clinic-detail-view";

export default async function ClinicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ClinicDetailView clinicId={id} />;
}
