import { Suspense } from "react";
import { AppointmentsView } from "@/features/appointments/components/appointments-view";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AppointmentsView />
    </Suspense>
  );
}
