"use client";

import {
  CalendarIcon,
  CheckCircledIcon,
  ClockIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  PersonIcon,
  PlusIcon,
} from "@radix-ui/react-icons";
import { Text } from "@radix-ui/themes";
import type { ReactNode } from "react";
import { AsyncContent } from "@/components/async-content";
import { PatientChip, StatusChip } from "@/components/glance";
import { PageHeader } from "@/components/ui/page-header";
import { RelativeTime } from "@/components/ui/relative-time";
import { Surface } from "@/components/ui/surface";
import { useService } from "@/di/container-provider";
import type { CurrentUser } from "@/domain/auth";
import type {
  AppointmentListItem,
  MeDashboard,
  RecentDecision,
} from "@/domain/repositories";
import { useAuth } from "@/features/auth/auth-provider";
import { needsSetup } from "@/features/landing/components/landing-cards";
import { NextAppointmentGlance } from "@/features/landing/components/next-appointment-glance";
import { QuickLinkCard } from "@/features/landing/components/quick-link-card";
import { useAsyncData } from "@/hooks/use-async-data";

export function DashboardView() {
  const { user } = useAuth();
  const dashboardService = useService("dashboardService");
  const mine = useAsyncData(
    () => dashboardService.getMine(),
    user?.subject ?? "",
  );

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={user ? `Welcome back, ${user.displayName}.` : undefined}
      />
      <AsyncContent
        loading={mine.loading}
        error={mine.error}
        isEmpty={!mine.data}
        onRetry={mine.reload}
      >
        {user && mine.data && <Sections user={user} data={mine.data} />}
      </AsyncContent>
    </>
  );
}

function Sections({ user, data }: { user: CurrentUser; data: MeDashboard }) {
  const sections: ReactNode[] = [];

  if (data.admin)
    sections.push(
      <Section key="admin" title="Admin" icon={<CheckCircledIcon />}>
        <QuickLinkCard
          href="/approvals"
          icon={<CheckCircledIcon />}
          title="Doctor approvals"
          hint="Doctors waiting to be verified."
          count={data.admin.pendingProviderVerificationCount}
          tone={
            data.admin.pendingProviderVerificationCount
              ? "attention"
              : "default"
          }
        />
        <QuickLinkCard
          href="/clinics"
          icon={<HomeIcon />}
          title="Clinics"
          hint="Clinics on the network."
          count={data.admin.clinicCount}
        />
        <QuickLinkCard
          href="/providers"
          icon={<PersonIcon />}
          title="Doctors"
          hint="All doctor records."
          count={data.admin.providerCount}
        />
        <QuickLinkCard
          href="/patients"
          icon={<PersonIcon />}
          title="Patients"
          hint="Everyone registered."
          count={data.admin.patientCount}
        />
        <QuickLinkCard
          href="/appointments"
          icon={<CalendarIcon />}
          title="Today's appointments"
          hint="Every visit today."
          count={data.admin.todayAppointmentCount}
        />
      </Section>,
    );

  if (data.clinicAdmin)
    sections.push(
      <Section key="clinicadmin" title="Clinic admin" icon={<HomeIcon />}>
        <QuickLinkCard
          href="/clinic-doctors"
          icon={<CheckCircledIcon />}
          title="Join requests"
          hint="Doctors waiting for you to admit them."
          count={data.clinicAdmin.pendingProviderVerificationCount}
          tone={
            data.clinicAdmin.pendingProviderVerificationCount
              ? "attention"
              : "default"
          }
        />
        <QuickLinkCard
          href="/clinic-doctors"
          icon={<PersonIcon />}
          title="Clinic doctors"
          hint="Doctors practising at your clinic."
          count={data.clinicAdmin.providerCount}
        />
        <QuickLinkCard
          href="/appointments"
          icon={<CalendarIcon />}
          title="Clinic schedule"
          hint="Today's visits at your clinic."
          count={data.clinicAdmin.todayAppointmentCount}
        />
      </Section>,
    );

  if (data.doctor) {
    const pending = data.doctor.pendingRequestCount ?? 0;
    sections.push(
      <Section key="doctor" title="Doctor" icon={<ClockIcon />}>
        <QuickLinkCard
          href="/appointments?status=REQUESTED"
          icon={<ClockIcon />}
          title="Pending requests"
          hint="Patients waiting for you to accept or reject."
          count={data.doctor.pendingRequestCount}
          tone={pending ? "attention" : "default"}
        />
        <QuickLinkCard
          href="/appointments"
          icon={<CalendarIcon />}
          title="Today's schedule"
          hint="Your visits today."
          count={data.doctor.todayAppointmentCount}
        />
        <QuickLinkCard
          href="/appointments"
          icon={<CalendarIcon />}
          title="This week"
          hint="Your visits in the next seven days."
          count={data.doctor.weekAppointmentCount}
        />
        <QuickLinkCard
          href="/patients"
          icon={<PersonIcon />}
          title="My patients"
          hint="Patients you have seen or booked with you."
          count={data.doctor.distinctPatientCount}
        />
        <QuickLinkCard
          href="/my-clinic"
          icon={<HomeIcon />}
          title="My clinic"
          hint="The clinic you practise at."
        />
        <NextVisit appointment={data.doctor.nextAppointment} />
      </Section>,
    );
  }

  if (data.patient)
    sections.push(
      <Section key="patient" title="Patient" icon={<MagnifyingGlassIcon />}>
        <QuickLinkCard
          href="/appointments?book=1"
          icon={<MagnifyingGlassIcon />}
          title="Book appointment"
          hint="Pick a doctor and a free time."
        />
        <QuickLinkCard
          href="/appointments"
          icon={<CalendarIcon />}
          title="My appointments"
          hint="Upcoming and past visits."
          count={data.patient.upcomingAppointmentCount}
        />
        <NextAppointmentGlance appointment={data.patient.nextAppointment} />
        <RecentDecisions decisions={data.patient.recentDecisions ?? []} />
      </Section>,
    );

  if (user.provider && user.provider.verificationStatus !== "VERIFIED")
    sections.push(
      <Section key="provider" title="Doctor application" icon={<PlusIcon />}>
        <QuickLinkCard
          href="/onboarding"
          icon={<PlusIcon />}
          title={
            user.provider.verificationStatus === "REJECTED"
              ? "Application not approved"
              : "Approval status"
          }
          hint={
            user.provider.verificationStatus === "REJECTED"
              ? "Contact your clinic administrator."
              : "Waiting for review. See the status here."
          }
          tone={
            user.provider.verificationStatus === "REJECTED"
              ? "alert"
              : "attention"
          }
        />
      </Section>,
    );

  if (needsSetup(user))
    sections.push(
      <Section key="setup" title="Get started" icon={<PlusIcon />}>
        <QuickLinkCard
          href="/onboarding"
          icon={<PlusIcon />}
          title="Finish setting up your account"
          hint="Choose how you will use MediPulse Life."
          tone="attention"
        />
      </Section>,
    );

  return <div className="flex flex-col gap-8">{sections}</div>;
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h2
        className="m-0 flex items-center gap-2 text-base font-semibold"
        style={{ color: "var(--mp-ink)" }}
      >
        <span aria-hidden="true" style={{ color: "var(--mp-primary)" }}>
          {icon}
        </span>
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </section>
  );
}

function NextVisit({
  appointment,
}: {
  appointment: AppointmentListItem | null;
}) {
  return (
    <Surface
      padding="md"
      className="flex flex-col gap-3 sm:col-span-2 lg:col-span-3"
    >
      <p
        className="m-0 text-sm font-semibold"
        style={{ color: "var(--mp-ink)" }}
      >
        Next appointment
      </p>
      {appointment ? (
        <div className="flex flex-wrap items-center gap-3">
          <RelativeTime iso={appointment.appointmentDateTime} style="long" />
          <PatientChip
            patient={{
              id: appointment.patientId,
              name: appointment.patientName,
            }}
            highestSeverity={appointment.patientHighestAllergySeverity}
          />
          <StatusChip
            kind="appointment"
            status={appointment.status}
            interactive={false}
          />
        </div>
      ) : (
        <Text size="2" style={{ color: "var(--mp-muted)" }}>
          No upcoming visits.
        </Text>
      )}
    </Surface>
  );
}

function RecentDecisions({ decisions }: { decisions: RecentDecision[] }) {
  if (decisions.length === 0) return null;
  return (
    <Surface padding="md" className="sm:col-span-2 lg:col-span-3">
      <p
        className="m-0 mb-3 text-sm font-semibold"
        style={{ color: "var(--mp-ink)" }}
      >
        Recent decisions
      </p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {decisions.map((decision) => (
          <li
            key={decision.appointmentId}
            className="flex flex-wrap items-center gap-2 text-sm"
          >
            <span style={{ color: "var(--mp-ink)" }}>
              {decision.providerName}
            </span>
            <StatusChip
              kind="appointment"
              status={decision.status}
              interactive={false}
            />
            {decision.decidedAtUtc && (
              <span style={{ color: "var(--mp-muted)" }}>
                <RelativeTime iso={decision.decidedAtUtc} />
              </span>
            )}
          </li>
        ))}
      </ul>
    </Surface>
  );
}
