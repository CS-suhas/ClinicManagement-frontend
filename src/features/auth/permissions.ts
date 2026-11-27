import type { CurrentUser, Role } from "@/domain/auth";

export const ROUTE_ROLES = {
  "/dashboard": null,
  "/appointments": null,
  "/clinics": ["admin"],
  "/clinics/[id]": null,
  "/providers": ["admin"],
  "/patients": ["admin", "doctor"],
  "/patients/[id]": ["admin", "doctor", "patient"],
  "/allergies": ["admin"],
  "/approvals": ["admin"],
  "/my-clinic": ["doctor"],
  "/clinic-doctors": ["clinicadmin"],
  "/doctors": null,
  "/onboarding": null,
  "/onboarding/patient": null,
} as const satisfies Record<string, readonly Role[] | null>;

export type NavBadge = "approvals" | "clinicApprovals";

export type NavItem = {
  href: string;
  label: string;
  roles: readonly Role[] | null;
  badge?: NavBadge;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", roles: ROUTE_ROLES["/dashboard"] },
  { href: "/clinics", label: "Clinics", roles: ROUTE_ROLES["/clinics"] },
  { href: "/providers", label: "Providers", roles: ROUTE_ROLES["/providers"] },
  { href: "/patients", label: "Patients", roles: ROUTE_ROLES["/patients"] },
  { href: "/allergies", label: "Allergies", roles: ROUTE_ROLES["/allergies"] },
  {
    href: "/appointments",
    label: "Appointments",
    roles: ROUTE_ROLES["/appointments"],
  },
  {
    href: "/approvals",
    label: "Approvals",
    roles: ROUTE_ROLES["/approvals"],
    badge: "approvals",
  },
  { href: "/my-clinic", label: "My clinic", roles: ROUTE_ROLES["/my-clinic"] },
  {
    href: "/clinic-doctors",
    label: "Clinic doctors",
    roles: ROUTE_ROLES["/clinic-doctors"],
    badge: "clinicApprovals",
  },
];

export function hasRole(
  user: Pick<CurrentUser, "roles"> | null,
  ...roles: Role[]
): boolean {
  if (!user) return false;
  return roles.some((role) => user.roles.includes(role));
}

export function canBookOnline(
  user: Pick<CurrentUser, "roles" | "patient"> | null,
): boolean {
  return user !== null && hasRole(user, "patient") && user.patient !== null;
}

function matchesRoute(route: string, pathname: string): boolean {
  const routeParts = route.split("/");
  const pathParts = pathname.split("/");
  if (pathParts.length < routeParts.length) return false;
  return routeParts.every((part, i) =>
    part === "[id]" ? pathParts[i].length > 0 : part === pathParts[i],
  );
}

function routeFor(pathname: string): keyof typeof ROUTE_ROLES | undefined {
  const routes = Object.keys(ROUTE_ROLES) as (keyof typeof ROUTE_ROLES)[];
  let best: keyof typeof ROUTE_ROLES | undefined;
  for (const route of routes) {
    if (!matchesRoute(route, pathname)) continue;
    if (best === undefined || route.split("/").length > best.split("/").length)
      best = route;
  }
  return best;
}

export function canAccessRoute(
  user: Pick<CurrentUser, "roles"> | null,
  pathname: string,
): boolean {
  if (!user) return false;
  const match = routeFor(pathname);
  if (!match) return false;
  const required = ROUTE_ROLES[match];
  return required === null || hasRole(user, ...required);
}

export function needsOnboarding(
  user: Pick<CurrentUser, "roles" | "patient" | "provider"> | null,
): boolean {
  if (!user) return false;
  if (user.roles.length === 0) return true;
  const provider = user.provider;
  return (
    provider !== null &&
    user.patient === null &&
    (provider.verificationStatus === "PENDING" ||
      provider.verificationStatus === "REJECTED")
  );
}

export function isOnboardingExempt(pathname: string): boolean {
  return (
    matchesRoute("/onboarding", pathname) ||
    matchesRoute("/doctors", pathname) ||
    matchesRoute("/clinics/[id]", pathname) ||
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/login/callback"
  );
}
