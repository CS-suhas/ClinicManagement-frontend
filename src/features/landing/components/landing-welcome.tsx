"use client";

import { DashboardIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { useAuth } from "@/features/auth/auth-provider";
import { RoleBadges } from "@/features/auth/role-badges";
import { useDashboard } from "@/features/dashboard/api";
import { buildLandingCards, MAX_LANDING_CARDS } from "./landing-cards";
import { NextAppointmentGlance } from "./next-appointment-glance";
import { QuickLinkCard } from "./quick-link-card";

const PADDING = { paddingInline: "clamp(1.25rem, 5vw, 4rem)" } as const;

export function LandingWelcome() {
  const { user, loading } = useAuth();
  if (!loading && !user) return null;

  return (
    <section
      className="relative z-[1] py-8"
      style={PADDING}
      aria-label="Get started"
    >
      {loading ? (
        <div aria-hidden="true" className="h-24 w-full" />
      ) : (
        <SignedIn />
      )}
    </section>
  );
}

function SignedIn() {
  const { user } = useAuth();
  const dashboard = useDashboard();
  if (!user) return null;

  const cards = buildLandingCards(user, dashboard.data ?? null);
  const shown = cards.slice(0, MAX_LANDING_CARDS);
  const hidden = cards.length - shown.length;

  return (
    <div className="flex flex-col gap-6">
      <div
        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[var(--mp-surface)] p-4"
        style={{ border: "1px solid var(--mp-paper-deep)" }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <PersonAvatar name={user.displayName} size={40} />
          <div className="min-w-0">
            <p
              className="m-0 truncate text-lg font-semibold"
              style={{ color: "var(--mp-ink)" }}
            >
              Welcome back, {user.displayName}
            </p>
            <div className="mt-1">
              <RoleBadges roles={user.roles} />
            </div>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold no-underline"
          style={{ color: "var(--mp-primary)" }}
        >
          <DashboardIcon aria-hidden="true" />
          Go to dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {user.roles.includes("patient") && user.patient && dashboard.data && (
          <NextAppointmentGlance
            appointment={dashboard.data.patient?.nextAppointment ?? null}
          />
        )}
        {shown.map((card) => (
          <QuickLinkCard
            key={card.href}
            href={card.href}
            icon={card.icon}
            title={card.title}
            hint={card.hint}
            count={card.count}
            tone={card.tone}
          />
        ))}
        {hidden > 0 && (
          <QuickLinkCard
            href="/dashboard"
            icon={<DashboardIcon />}
            title="More on your dashboard"
            hint={`${hidden} more ${hidden === 1 ? "link" : "links"} for your roles.`}
          />
        )}
      </div>
    </div>
  );
}
