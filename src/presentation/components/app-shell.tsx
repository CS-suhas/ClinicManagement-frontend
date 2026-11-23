"use client";

import {
  ExclamationTriangleIcon,
  ExitIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import { Button, DropdownMenu, Spinner } from "@radix-ui/themes";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, Suspense, useEffect, useState } from "react";
import {
  canAccessRoute,
  hasRole,
  isOnboardingExempt,
  NAV_ITEMS,
  type NavBadge,
  needsOnboarding,
} from "@/application/auth/permissions";
import { useService } from "@/di/container-provider";
import type { PublicAccess } from "@/domain/auth";
import { useAuth } from "@/presentation/auth/auth-provider";
import { RoleBadges } from "@/presentation/auth/role-badges";
import { usePublicAccess } from "@/presentation/auth/use-public-access";
import { CommandPalette } from "@/presentation/features/command-palette/command-palette";
import { NotificationBell } from "@/presentation/features/notification-bell/notification-bell";
import { useMyDashboard } from "@/presentation/features/notification-bell/use-my-dashboard";
import { getErrorMessage } from "../lib/errors";
import { useNotify } from "./notifications";
import { IconCircle } from "./ui/icon-circle";
import { PersonAvatar } from "./ui/person-avatar";
import { Surface } from "./ui/surface";
import { Wordmark } from "./ui/wordmark";

const PAGE_BACKGROUND = "#f3f8f7";

const isLoginPath = (pathname: string) =>
  pathname === "/login" || pathname === "/login/callback";

const isDoctorsPath = (pathname: string) =>
  pathname === "/doctors" || pathname.startsWith("/doctors/");

/** Pages that bring their own header and render without the admin navbar. */
function hasOwnLayout(pathname: string): boolean {
  return pathname === "/" || isLoginPath(pathname) || isDoctorsPath(pathname);
}

/**
 * Whether anonymous visitors may open the page. The doctor directory is public
 * unless the deployment turns it off (PUBLIC_DOCTORS=false); null while that
 * runtime setting is still loading.
 */
function allowsAnonymous(
  pathname: string,
  publicAccess: PublicAccess | null,
): boolean | null {
  if (pathname === "/" || isLoginPath(pathname)) return true;
  if (isDoctorsPath(pathname)) return publicAccess?.doctors ?? null;
  return false;
}

/** Pathname plus query string, so a redirect can bring the user back exactly. */
function currentTarget(pathname: string): string {
  return `${pathname}${window.location.search}`;
}

/** The count a nav badge shows, from the dashboard counts. */
function badgeCount(
  badge: NavBadge,
  mine: ReturnType<typeof useMyDashboard>["data"],
): number {
  if (!mine) return 0;
  if (badge === "approvals")
    return mine.admin?.pendingProviderVerificationCount ?? 0;
  return (
    mine.admin?.pendingJoinRequestCount ??
    mine.clinicAdmin?.pendingJoinRequestCount ??
    0
  );
}

/**
 * The chrome around every page. The pathname hook sits inside Suspense so
 * dynamic routes (/patients/[id], /clinics/[id]) can prerender their shell
 * instead of blocking the build on a value only known at request time.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ShellFrame>{children}</ShellFrame>
    </Suspense>
  );
}

function ShellFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const personas = useService("authPersonas");
  const notify = useNotify();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { data: mine } = useMyDashboard(user?.subject ?? null);
  const isActive = (href: string) => pathname.startsWith(href);
  const publicAccess = usePublicAccess();
  const anonymousAllowed = allowsAnonymous(pathname, publicAccess);
  const ownLayout = hasOwnLayout(pathname);
  const signedIn = user !== null;
  const gated =
    user !== null && needsOnboarding(user) && !isOnboardingExempt(pathname);

  useEffect(() => {
    if (anonymousAllowed !== false || loading || signedIn) return;
    router.replace(
      `/login?next=${encodeURIComponent(currentTarget(pathname))}`,
    );
  }, [anonymousAllowed, loading, signedIn, pathname, router]);

  // A user who has not finished setting up goes to onboarding, keeping where they were headed.
  useEffect(() => {
    if (!gated) return;
    router.replace(
      `/onboarding?next=${encodeURIComponent(currentTarget(pathname))}`,
    );
  }, [gated, pathname, router]);

  if (ownLayout)
    return anonymousAllowed || signedIn ? children : <LoadingScreen />;
  // Only a missing user shows the spinner: a session refresh keeps the page mounted.
  if (!user || gated) return <LoadingScreen />;

  const allowed = canAccessRoute(user, pathname);
  const navItems = NAV_ITEMS.filter(
    (item) => item.roles === null || hasRole(user, ...item.roles),
  );

  async function handleSignOut() {
    try {
      await signOut();
      router.replace("/login");
    } catch (e) {
      notify.notifyError(getErrorMessage(e));
    }
  }

  return (
    <div className="min-h-screen" style={{ background: PAGE_BACKGROUND }}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow-md"
        style={{ color: "var(--mp-ink)" }}
      >
        Skip to content
      </a>
      <header
        className="flex flex-wrap items-stretch justify-between gap-x-6 bg-white px-6 md:px-12"
        style={{ borderBottom: "1px solid var(--mp-paper-deep)" }}
      >
        <div className="flex items-center py-3">
          <Wordmark href="/dashboard" />
        </div>

        <nav
          aria-label="Main"
          className="order-last -mx-6 flex w-[calc(100%+3rem)] min-w-0 items-stretch overflow-x-auto px-6 md:order-none md:mx-0 md:w-auto md:flex-1 md:px-0"
        >
          {navItems.map(({ href, label, badge }) => {
            const active = isActive(href);
            const count = badge ? badgeCount(badge, mine) : 0;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className="relative inline-flex shrink-0 items-center whitespace-nowrap px-3 text-sm no-underline transition-colors hover:text-[var(--mp-ink)]"
                style={{
                  color: active ? "var(--mp-ink)" : "var(--mp-muted)",
                  fontWeight: active ? 600 : 500,
                }}
              >
                {label}
                {count > 0 && (
                  <span
                    className="ml-1.5 inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold"
                    style={{
                      background: "#fdf3dc",
                      color: "#8a5a12",
                      height: 20,
                    }}
                  >
                    {count}
                    <span className="sr-only"> pending</span>
                  </span>
                )}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5"
                    style={{ background: "var(--mp-primary)" }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1 py-3">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label="Search (Ctrl K)"
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border-0 bg-transparent px-2 text-sm"
            style={{ color: "var(--mp-muted)" }}
          >
            <MagnifyingGlassIcon width={18} height={18} aria-hidden="true" />
            <kbd
              className="hidden rounded border px-1.5 text-xs md:inline"
              style={{ borderColor: "var(--mp-paper-deep)" }}
            >
              Ctrl K
            </kbd>
          </button>
          <NotificationBell mine={mine} user={user} />
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-2 rounded-full py-1 pr-2 text-sm font-medium"
                style={{ color: "var(--mp-ink)" }}
              >
                <PersonAvatar name={user.displayName} size={32} />
                <span className="hidden sm:inline">{user.displayName}</span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end" style={{ minWidth: 240 }}>
              <div className="px-2 pb-2 pt-1">
                <div
                  className="text-sm font-semibold"
                  style={{ color: "var(--mp-ink)" }}
                >
                  {user.displayName}
                </div>
                <div className="mt-2">
                  <RoleBadges roles={user.roles} />
                </div>
              </div>
              <DropdownMenu.Separator />
              {personas.length > 0 && (
                <DropdownMenu.Item asChild>
                  <Link href="/login">Switch user</Link>
                </DropdownMenu.Item>
              )}
              <DropdownMenu.Item onSelect={() => void handleSignOut()}>
                <ExitIcon />
                Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      </header>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        user={user}
      />

      <main id="main-content" className="px-6 py-8 md:px-12">
        {allowed ? (
          children
        ) : (
          <Surface
            padding="lg"
            role="alert"
            className="flex items-start gap-4"
            style={{ maxWidth: 560 }}
          >
            <IconCircle size={40}>
              <ExclamationTriangleIcon />
            </IconCircle>
            <div>
              <p
                className="m-0 text-base font-semibold"
                style={{ color: "var(--mp-ink)" }}
              >
                No access
              </p>
              <p
                className="mb-3 mt-1 text-sm"
                style={{ color: "var(--mp-muted)" }}
              >
                You don&apos;t have access to this page.
              </p>
              <Button asChild color="teal" variant="soft">
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
            </div>
          </Surface>
        )}
      </main>
    </div>
  );
}

function LoadingScreen() {
  return (
    <output
      aria-label="Loading"
      className="flex min-h-screen items-center justify-center"
      style={{ background: PAGE_BACKGROUND }}
    >
      <Spinner size="3" />
    </output>
  );
}
