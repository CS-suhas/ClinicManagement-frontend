import {
  PatientDetailView,
  type PatientTab,
} from "@/presentation/features/patient-detail/patient-detail-view";

const TABS: PatientTab[] = ["overview", "appointments", "allergies"];

/** `?tab=allergies` opens the Allergies tab; anything else opens the overview. */
export default async function PatientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const initialTab = TABS.find((value) => value === tab) ?? "overview";
  return <PatientDetailView patientId={id} initialTab={initialTab} />;
}
