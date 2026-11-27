import type { CurrentUser } from "@/domain/auth";
import type { MeDashboard } from "@/domain/repositories";

export type NotificationItem = {
  id: string;
  text: string;
  href: string;
  at?: string | null;
};

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
  }

  const joinRequests = mine.clinicAdmin?.pendingProviderVerificationCount ?? 0;
  if (joinRequests > 0)
    items.push({
      id: `join-requests:${joinRequests}`,
      text: plural(joinRequests, "doctor join request", "to review"),
      href: "/clinic-doctors",
    });

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

export const NOTIFICATION_SEEN_KEY = "medipulse:notifications-seen";
const MAX_REMEMBERED = 200;

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

export function writeSeenIds(ids: string[]): void {
  try {
    window.localStorage.setItem(
      NOTIFICATION_SEEN_KEY,
      JSON.stringify(ids.slice(-MAX_REMEMBERED)),
    );
  } catch {}
}
