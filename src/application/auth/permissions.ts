import type { CurrentUser, Role } from "@/domain/auth";

/**
 * Which roles may open each protected route. `null` means any signed-in user.
 * Mirrors the backend access rules; the API stays the real enforcement point.
 */
export const ROUTE_ROLES = {
  "/dashboard": null,
  "/appointments": null,
  "/clinics": ["admin", "clinicadmin"],
  "/providers": ["admin"],
  "/patients": ["admin"],
  "/allergies": ["admin"],
} as const satisfies Record<string, readonly Role[] | null>;

export interface NavItem {
  href: string;
  label: string;
  /** Roles that can see the item; `null` means any signed-in user. */
  roles: readonly Role[] | null;
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
];

/** True when the user holds at least one of the given roles. */
export function hasRole(
  user: Pick<CurrentUser, "roles"> | null,
  ...roles: Role[]
): boolean {
  if (!user) return false;
  return roles.some((role) => user.roles.includes(role));
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
  const routes = Object.keys(ROUTE_ROLES) as (keyof typeof ROUTE_ROLES)[];
  const match = routes.find(
    (href) => pathname === href || pathname.startsWith(`${href}/`),
  );
  if (!match) return false;
  const required = ROUTE_ROLES[match];
  return required === null || hasRole(user, ...required);
}
