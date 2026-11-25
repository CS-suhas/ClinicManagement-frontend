import type { CurrentUser } from "@/domain/auth";
import type { MeDashboard } from "@/domain/repositories";

export interface NotificationItem {
  /** Stable across polls; a count in the id makes a changed count unread again. */
  id: string;
  text: string;
  href: string;
  /** ISO time for a RelativeTime line, when the API has one. */
  at?: string | null;
}

/** What the signed-in user should look at, one row per open item. Pure. */
export function notificationItems(
  mine: MeDashboard | null,
  user: Pick<CurrentUser, "roles"> | null,
): NotificationItem[] {
  if (!mine || !user) return [];
  const items: NotificationItem[] = [];

  if (mine.admin) {
    const approvals = mine.admin.pendingProviderVerificationCount;
    if (approvals > 0)
      items.push({
        id: `approvals:${approvals}`,
        text: plural(approvals, "doctor application", "waiting for approval"),
        href: "/approvals",
      });
    const joins = mine.admin.pendingJoinRequestCount ?? 0;
    if (joins > 0)
      items.push({
        id: `joins:admin:${joins}`,
        text: plural(joins, "clinic move request", "waiting for a decision"),
        href: "/join-requests",
      });
  }

  if (mine.clinicAdmin && mine.clinicAdmin.pendingJoinRequestCount > 0) {
    const joins = mine.clinicAdmin.pendingJoinRequestCount;
    items.push({
      id: `joins:clinic:${joins}`,
      text: plural(joins, "clinic move request", "waiting for a decision"),
      href: "/join-requests",
    });
  }

  const requests = mine.doctor?.pendingRequestCount ?? 0;
  if (requests > 0)
    items.push({
      id: `requests:${requests}`,
      text: plural(requests, "appointment request", "to answer"),
      href: "/appointments?status=REQUESTED",
    });

  for (const decision of mine.patient?.recentDecisions ?? []) {
    const accepted = decision.status === "CONFIRMED";
    items.push({
      id: `decision:${decision.appointmentId}:${decision.status}`,
      text: `${decision.providerName} ${accepted ? "accepted" : "rejected"} your appointment request`,
      href: "/appointments",
      at: decision.decidedAtUtc,
    });
  }

  return items;
}

function plural(count: number, noun: string, tail: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"} ${count === 1 ? "is" : "are"} ${tail}`;
}

/** localStorage key for the ids the user has seen. */
export const NOTIFICATION_SEEN_KEY = "medipulse:notifications-seen";
const MAX_REMEMBERED = 200;

/** Reads the seen ids. Storage can be blocked or hold junk, so any failure reads as none seen. */
export function readSeenIds(): string[] {
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_SEEN_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

/** Saves the seen ids, keeping the newest ones. Failures are ignored: the bell just shows items as unread again. */
export function writeSeenIds(ids: string[]): void {
  try {
    window.localStorage.setItem(
      NOTIFICATION_SEEN_KEY,
      JSON.stringify(ids.slice(-MAX_REMEMBERED)),
    );
  } catch {
    // Storage is unavailable (private window, blocked site data).
  }
}
