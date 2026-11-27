"use client";

import Link from "next/link";
import { DoctorChip, StatusChip } from "@/components/glance";
import { RelativeTime } from "@/components/ui/relative-time";
import { Surface } from "@/components/ui/surface";
import type { AppointmentListItem } from "@/domain/repositories";

export function NextAppointmentGlance({
  appointment,
}: {
  appointment: AppointmentListItem | null;
}) {
  if (!appointment)
    return (
      <Surface
        padding="md"
        className="flex flex-col gap-2 sm:col-span-2 lg:col-span-3"
      >
        <p
          className="m-0 text-sm font-semibold"
          style={{ color: "var(--mp-ink)" }}
        >
          Next visit
        </p>
        <p className="m-0 text-sm" style={{ color: "var(--mp-muted)" }}>
          No upcoming visits.{" "}
          <Link
            href="/doctors"
            className="font-semibold"
            style={{ color: "var(--mp-primary)" }}
          >
            Find a doctor
          </Link>
        </p>
      </Surface>
    );

  return (
    <Surface
      padding="md"
      className="flex flex-col gap-3 sm:col-span-2 lg:col-span-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className="m-0 text-sm font-semibold"
          style={{ color: "var(--mp-ink)" }}
        >
          Next visit ·{" "}
          <RelativeTime iso={appointment.appointmentDateTime} style="long" />
        </p>
        <StatusChip
          kind="appointment"
          status={appointment.status}
          interactive={false}
        />
      </div>
      <DoctorChip
        provider={{
          id: appointment.providerId,
          firstName: appointment.providerName.split(" ")[0] ?? "",
          lastName: appointment.providerName.split(" ").slice(1).join(" "),
          specialty: appointment.providerSpecialty,
          clinicId: appointment.clinicId,
          clinicName: appointment.clinicName,
        }}
        showSpecialty
      />
    </Surface>
  );
}
