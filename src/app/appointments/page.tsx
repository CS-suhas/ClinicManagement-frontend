import { Suspense } from "react";
import { AppointmentsView } from "@/presentation/features/appointments/appointments-view";

export default function Page() {
  // Search params need a Suspense boundary so the page can still prerender.
  return (
    <Suspense fallback={null}>
      <AppointmentsView />
    </Suspense>
  );
}
