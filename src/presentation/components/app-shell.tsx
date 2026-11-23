"use client";

import {
  CalendarIcon,
  DashboardIcon,
  ExclamationTriangleIcon,
  HomeIcon,
  IdCardIcon,
  PersonIcon,
} from "@radix-ui/react-icons";
import { Box, Flex, Heading, Separator, Text } from "@radix-ui/themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Public pages render without the admin sidebar. */
const PUBLIC_ROUTES = ["/", "/doctors"];

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/clinics", label: "Clinics", icon: HomeIcon },
  { href: "/providers", label: "Providers", icon: IdCardIcon },
  { href: "/patients", label: "Patients", icon: PersonIcon },
  { href: "/allergies", label: "Allergies", icon: ExclamationTriangleIcon },
  { href: "/appointments", label: "Appointments", icon: CalendarIcon },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname.startsWith(href);

  if (PUBLIC_ROUTES.includes(pathname)) return <>{children}</>;

  return (
    <Flex className="min-h-screen flex-col md:flex-row">
      <Box
        asChild
        className="md:w-60 md:min-h-screen border-b md:border-b-0 md:border-r"
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
              {NAV.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
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
        </aside>
      </Box>
      <Box asChild className="flex-1 min-w-0" p={{ initial: "4", md: "6" }}>
        <main>{children}</main>
      </Box>
    </Flex>
  );
}
