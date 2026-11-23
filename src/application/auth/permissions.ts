import type { CurrentUser, Role } from "@/domain/auth";

/**
 * Which roles may open each protected route. `null` means any signed-in user.
 * Dynamic segments are written as `[id]`. Mirrors the backend access rules; the
 * API stays the real enforcement point. Routes that need a finer check (a
 * doctor's own patients, a patient's own record) are enforced by their page.
 */
export const ROUTE_ROLES = {
  "/dashboard": null,
  "/appointments": null,
  "/clinics": ["admin", "clinicadmin"],
  "/clinics/[id]": null,
  "/providers": ["admin"],
  "/patients": ["admin", "doctor"],
  /** A patient may open their own record; the page checks that it is theirs. */
  "/patients/[id]": ["admin", "doctor", "patient"],
  "/allergies": ["admin"],
  "/approvals": ["admin"],
  "/join-requests": ["admin", "clinicadmin"],
  "/my-clinic": ["doctor"],
  /** Public directory: no sign-in needed unless the deployment sets PUBLIC_DOCTORS=false. */
  "/doctors": null,
  /** Any signed-in user may create their own patient profile or registration. */
  "/onboarding": null,
  "/onboarding/patient": null,
} as const satisfies Record<string, readonly Role[] | null>;

/** Nav badges the shell fills from the signed-in user's dashboard counts. */
export type NavBadge = "approvals" | "joinRequests";

export interface NavItem {
  href: string;
  label: string;
  /** Roles that can see the item; `null` means any signed-in user. */
  roles: readonly Role[] | null;
  badge?: NavBadge;
}

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
  {
    href: "/join-requests",
    label: "Join requests",
    roles: ROUTE_ROLES["/join-requests"],
    badge: "joinRequests",
  },
  { href: "/my-clinic", label: "My clinic", roles: ROUTE_ROLES["/my-clinic"] },
];

/** True when the user holds at least one of the given roles. */
export function hasRole(
  user: Pick<CurrentUser, "roles"> | null,
  ...roles: Role[]
): boolean {
  if (!user) return false;
  return roles.some((role) => user.roles.includes(role));
}

/** Online booking is for patient accounts that have a linked patient record. */
export function canBookOnline(
  user: Pick<CurrentUser, "roles" | "patient"> | null,
): boolean {
  return user !== null && hasRole(user, "patient") && user.patient !== null;
}

/** True when a route pattern such as `/clinics/[id]` matches the pathname. */
function matchesRoute(route: string, pathname: string): boolean {
  const routeParts = route.split("/");
  const pathParts = pathname.split("/");
  if (pathParts.length < routeParts.length) return false;
  return routeParts.every((part, i) =>
    part === "[id]" ? pathParts[i].length > 0 : part === pathParts[i],
  );
}

/** The most specific ROUTE_ROLES entry for a pathname, or undefined. */
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

/**
 * True when the user may open the pathname. Unknown paths are denied, so a new
 * route must be added to ROUTE_ROLES before it is reachable.
 */
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

/**
 * True when the signed-in user has to finish setting up before using the app:
 * no roles at all, a doctor application that is pending or rejected without a
 * patient profile, or a verified doctor with no clinic and no other role.
 */
export function needsOnboarding(
  user: Pick<CurrentUser, "roles" | "patient" | "provider"> | null,
): boolean {
  if (!user) return false;
  if (user.roles.length === 0) return true;
  const provider = user.provider;
  if (
    provider &&
    user.patient === null &&
    (provider.verificationStatus === "PENDING" ||
      provider.verificationStatus === "REJECTED")
  )
    return true;
  return (
    provider?.verificationStatus === "VERIFIED" &&
    provider.clinicId === null &&
    user.roles.every((role) => role === "doctor")
  );
}

/**
 * Pages a user may open while still needing onboarding. Without these the gate
 * would bounce them in a loop: onboarding itself, the public directory, and the
 * clinic pages a clinic-less doctor uses to join.
 */
export function isOnboardingExempt(pathname: string): boolean {
  return (
    matchesRoute("/onboarding", pathname) ||
    matchesRoute("/doctors", pathname) ||
    matchesRoute("/my-clinic", pathname) ||
    matchesRoute("/clinics/[id]", pathname) ||
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/login/callback"
  );
}
