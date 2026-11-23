"use client";

import {
  CalendarIcon,
  DashboardIcon,
  ExclamationTriangleIcon,
  ExitIcon,
  HomeIcon,
  IdCardIcon,
  PersonIcon,
} from "@radix-ui/react-icons";
import {
  Box,
  Button,
  Callout,
  Flex,
  Heading,
  Separator,
  Spinner,
  Text,
} from "@radix-ui/themes";
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

/** Public pages render without the admin sidebar and need no sign-in. */
const PUBLIC_ROUTES = ["/", "/doctors", "/login"];

const NAV_ICONS = {
  "/dashboard": DashboardIcon,
  "/clinics": HomeIcon,
  "/providers": IdCardIcon,
  "/patients": PersonIcon,
  "/allergies": ExclamationTriangleIcon,
  "/appointments": CalendarIcon,
} as const;

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
    <Flex className="min-h-screen flex-col md:flex-row">
      <Box
        asChild
        className="flex flex-col md:w-60 md:min-h-screen border-b md:border-b-0 md:border-r"
        style={{ borderColor: "var(--gray-a5)", background: "var(--gray-a2)" }}
      >
        <aside>
          <Box p="4">
            <Heading size="4">MediPulse Life</Heading>
            <Text size="1" color="gray">
              Management console
            </Text>
          </Box>
          <Separator size="4" />
          <nav aria-label="Main">
            <Flex
              direction={{ initial: "row", md: "column" }}
              gap="1"
              p="2"
              wrap="wrap"
            >
              {navItems.map(({ href, label }) => {
                const active = isActive(href);
                const Icon = NAV_ICONS[href as keyof typeof NAV_ICONS];
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm no-underline"
                    style={{
                      color: active ? "var(--accent-11)" : "var(--gray-12)",
                      background: active ? "var(--accent-a3)" : undefined,
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    <Icon />
                    {label}
                  </Link>
                );
              })}
            </Flex>
          </nav>
          <Box mt="auto" p="4">
            <Separator size="4" mb="4" />
            <Text as="p" size="2" weight="bold">
              {user.displayName}
            </Text>
            <Box my="2">
              <RoleBadges roles={user.roles} />
            </Box>
            <Flex direction="column" gap="1" align="start">
              {personas.length > 0 && (
                <Link href="/login" className="text-sm">
                  Switch user
                </Link>
              )}
              <Button
                variant="ghost"
                color="gray"
                size="1"
                onClick={() => void handleSignOut()}
              >
                <ExitIcon />
                Sign out
              </Button>
            </Flex>
          </Box>
        </aside>
      </Box>
      <Box asChild className="flex-1 min-w-0" p={{ initial: "4", md: "6" }}>
        <main>
          {allowed ? (
            children
          ) : (
            <Callout.Root color="amber" role="alert">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>
                You don&apos;t have access to this page.{" "}
                <Link href="/dashboard" className="underline">
                  Go to dashboard
                </Link>
              </Callout.Text>
            </Callout.Root>
          )}
        </main>
      </Box>
    </Flex>
  );
}

function LoadingScreen() {
  return (
    <Flex
      role="status"
      aria-label="Loading"
      align="center"
      justify="center"
      minHeight="100vh"
    >
      <Spinner size="3" />
    </Flex>
  );
}
