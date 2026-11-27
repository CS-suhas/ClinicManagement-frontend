import { PatientDetailView, type PatientTab } from "./patient-detail-view";

const TABS: PatientTab[] = ["overview", "appointments", "allergies"];

export function PatientDetailPage({
  patientId,
  tab,
}: {
  patientId: string;
  tab?: string | string[];
}) {
  const initialTab = TABS.find((value) => value === tab) ?? "overview";
  return <PatientDetailView patientId={patientId} initialTab={initialTab} />;
}
