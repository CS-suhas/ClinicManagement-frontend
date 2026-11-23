"use client";

import { ExclamationTriangleIcon, ExitIcon } from "@radix-ui/react-icons";
import { Button, DropdownMenu, Spinner } from "@radix-ui/themes";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import {
  canAccessRoute,
  hasRole,
  NAV_ITEMS,
} from "@/application/auth/permissions";
import { useService } from "@/di/container-provider";
import { useAuth } from "@/presentation/auth/auth-provider";
import { RoleBadges } from "@/presentation/auth/role-badges";
import { getErrorMessage } from "../lib/errors";
import { useNotify } from "./notifications";
import { IconCircle } from "./ui/icon-circle";
import { PersonAvatar } from "./ui/person-avatar";
import { Surface } from "./ui/surface";
import { Wordmark } from "./ui/wordmark";

/** Public pages render without the admin navbar and need no sign-in. */
const PUBLIC_ROUTES = ["/", "/doctors", "/login"];

const PAGE_BACKGROUND = "#f3f8f7";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const personas = useService("authPersonas");
  const notify = useNotify();
  const isActive = (href: string) => pathname.startsWith(href);
  const isPublic = PUBLIC_ROUTES.includes(pathname);
  const signedIn = user !== null;

  useEffect(() => {
    if (isPublic || loading || signedIn) return;
    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [isPublic, loading, signedIn, pathname, router]);

  if (isPublic) return <>{children}</>;
  if (loading || !user) return <LoadingScreen />;

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
          {navItems.map(({ href, label }) => {
            const active = isActive(href);
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

        <div className="flex items-center py-3">
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

      <main className="px-6 py-8 md:px-12">
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
