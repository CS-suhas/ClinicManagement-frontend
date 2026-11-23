import {
  CalendarIcon,
  CheckCircledIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  PersonIcon,
  PlusIcon,
  ReaderIcon,
} from "@radix-ui/react-icons";
import type { ReactNode } from "react";
import type { CurrentUser } from "@/domain/auth";
import type { MeDashboard } from "@/domain/repositories";
import type { LinkTone } from "./quick-link-card";

/** One quick link on the landing page or the dashboard. */
export interface LinkCard {
  href: string;
  title: string;
  hint: string;
  icon: ReactNode;
  /** Null or undefined hides the count pill. */
  count?: number | null;
  tone: LinkTone;
  /** Lower comes first: pending states, then doctor, clinic admin, admin, patient. */
  rank: number;
}

export const MAX_LANDING_CARDS = 6;

/** Whether the account holds no usable role yet and must finish onboarding. */
export function needsSetup(user: CurrentUser): boolean {
  return user.roles.length === 0 && !user.patient && !user.provider;
}

/**
 * The quick links for a signed-in user, from their roles and the counts in
 * `mine`. Several roles give several cards; duplicate hrefs collapse, and the
 * list is ordered by `rank`.
 */
export function buildLandingCards(
  user: CurrentUser,
  mine: MeDashboard | null,
): LinkCard[] {
  const cards: LinkCard[] = [];
  const has = (role: CurrentUser["roles"][number]) => user.roles.includes(role);

  if (needsSetup(user)) {
    cards.push({
      href: "/onboarding",
      title: "Finish setting up your account",
      hint: "Choose how you will use MediPulse Life.",
      icon: <PlusIcon />,
      tone: "attention",
      rank: 0,
    });
  }

  if (user.provider && user.provider.verificationStatus !== "VERIFIED") {
    const rejected = user.provider.verificationStatus === "REJECTED";
    cards.push({
      href: "/onboarding",
      title: rejected ? "Application not approved" : "Approval status",
      hint: rejected
        ? "Contact your clinic administrator."
        : "Waiting for review. See the status here.",
      icon: <ExclamationTriangleIcon />,
      tone: rejected ? "alert" : "attention",
      rank: 0,
    });
  }

  if (has("doctor")) {
    const pending = mine?.doctor?.pendingRequestCount ?? null;
    cards.push({
      href: "/appointments?status=REQUESTED",
      title: "Pending requests",
      hint: "Patients waiting for you to accept or reject.",
      icon: <ClockIcon />,
      count: pending,
      tone: pending ? "attention" : "default",
      rank: 1,
    });
    if (user.provider && user.provider.clinicId === null)
      cards.push({
        href: "/onboarding",
        title: "Join a clinic",
        hint: "Request to join a clinic so patients can book you.",
        icon: <HomeIcon />,
        tone: "attention",
        rank: 1,
      });
    cards.push({
      href: "/appointments",
      title: "Today's schedule",
      hint: "Your visits today.",
      icon: <CalendarIcon />,
      count: mine?.doctor?.todayAppointmentCount ?? null,
      tone: "default",
      rank: 2,
    });
    cards.push({
      href: "/patients",
      title: "My patients",
      hint: "Patients you have seen or booked with you.",
      icon: <PersonIcon />,
      count: mine?.doctor?.distinctPatientCount ?? null,
      tone: "default",
      rank: 2,
    });
  }

  if (has("clinicadmin")) {
    const joins = mine?.clinicAdmin?.pendingJoinRequestCount ?? null;
    cards.push({
      href: "/join-requests",
      title: "Join requests",
      hint: "Doctors asking to join your clinic.",
      icon: <ReaderIcon />,
      count: joins,
      tone: joins ? "attention" : "default",
      rank: 3,
    });
    cards.push({
      href: "/appointments",
      title: "Clinic schedule",
      hint: "Today's visits at your clinic.",
      icon: <CalendarIcon />,
      count: mine?.clinicAdmin?.todayAppointmentCount ?? null,
      tone: "default",
      rank: 3,
    });
  }

  if (has("admin")) {
    const approvals = mine?.admin?.pendingProviderVerificationCount ?? null;
    cards.push({
      href: "/approvals",
      title: "Doctor approvals",
      hint: "Doctors waiting to be verified.",
      icon: <CheckCircledIcon />,
      count: approvals,
      tone: approvals ? "attention" : "default",
      rank: 4,
    });
    cards.push({
      href: "/clinics",
      title: "Clinics",
      hint: "Clinics on the network.",
      icon: <HomeIcon />,
      count: mine?.admin?.clinicCount ?? null,
      tone: "default",
      rank: 4,
    });
    cards.push({
      href: "/patients",
      title: "Patients",
      hint: "Everyone registered with a clinic.",
      icon: <PersonIcon />,
      count: mine?.admin?.patientCount ?? null,
      tone: "default",
      rank: 4,
    });
  }

  if (has("patient") && user.patient) {
    cards.push({
      href: "/appointments?book=1",
      title: "Book appointment",
      hint: "Pick a doctor and a free time.",
      icon: <MagnifyingGlassIcon />,
      tone: "default",
      rank: 5,
    });
    cards.push({
      href: "/appointments",
      title: "My appointments",
      hint: "Upcoming and past visits.",
      icon: <CalendarIcon />,
      count: mine?.patient?.upcomingAppointmentCount ?? null,
      tone: "default",
      rank: 5,
    });
  }

  const seen = new Set<string>();
  return cards
    .filter((card) => {
      if (seen.has(card.href)) return false;
      seen.add(card.href);
      return true;
    })
    .sort((a, b) => a.rank - b.rank);
}
