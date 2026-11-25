"use client";

import { DashboardIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { useService } from "@/di/container-provider";
import { useAuth } from "@/presentation/auth/auth-provider";
import { RoleBadges } from "@/presentation/auth/role-badges";
import { PersonAvatar } from "@/presentation/components/ui/person-avatar";
import { useAsyncData } from "@/presentation/hooks/use-async-data";
import { buildLandingCards, MAX_LANDING_CARDS } from "./landing-cards";
import { NextAppointmentGlance } from "./next-appointment-glance";
import { QuickLinkCard } from "./quick-link-card";

const PADDING = { paddingInline: "clamp(1.25rem, 5vw, 4rem)" } as const;

/**
 * The role-aware section under the landing hero: greets a signed-in user and
 * lists quick links for each role. Renders nothing for signed-out visitors.
 * Counts come from one dashboard read and drop out silently if it fails.
 */
export function LandingWelcome() {
  const { user, loading } = useAuth();
  // Signed out, the hero's search and register link already cover everything.
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
  const dashboardService = useService("dashboardService");
  const mine = useAsyncData(
    () => dashboardService.getMine(),
    user?.subject ?? "",
  );
  if (!user) return null;

  const cards = buildLandingCards(user, mine.data ?? null);
  const shown = cards.slice(0, MAX_LANDING_CARDS);
  const hidden = cards.length - shown.length;

  return (
    <div className="flex flex-col gap-6">
      <div
        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4"
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
        {user.roles.includes("patient") && user.patient && mine.data && (
          <NextAppointmentGlance
            appointment={mine.data.patient?.nextAppointment ?? null}
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
