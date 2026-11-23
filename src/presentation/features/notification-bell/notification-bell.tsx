"use client";

import { BellIcon } from "@radix-ui/react-icons";
import { Button, Popover, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CurrentUser } from "@/domain/auth";
import type { MeDashboard } from "@/domain/repositories";
import { RelativeTime } from "@/presentation/components/ui/relative-time";
import {
  notificationItems,
  readSeenIds,
  writeSeenIds,
} from "./notification-items";

/**
 * Header bell. Lists what needs the user's attention, from the shared dashboard
 * counts. Unread state is the set of item ids the user has seen, kept in
 * localStorage; it is read after mount so server and client markup match.
 */
export function NotificationBell({
  mine,
  user,
}: {
  mine: MeDashboard | null;
  user: CurrentUser;
}) {
  const items = useMemo(() => notificationItems(mine, user), [mine, user]);
  const [seen, setSeen] = useState<string[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setSeen(readSeenIds());
  }, []);

  const seenSet = new Set(seen ?? []);
  const unread =
    seen === null ? 0 : items.filter((i) => !seenSet.has(i.id)).length;
  const countLabel = unread > 99 ? "99+" : String(unread);

  const markAllRead = () => {
    const next = [...new Set([...(seen ?? []), ...items.map((i) => i.id)])];
    setSeen(next);
    writeSeenIds(next);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <button
          type="button"
          aria-label={
            unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
          }
          className="relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent"
          style={{ color: "var(--mp-ink)" }}
        >
          <BellIcon width={18} height={18} />
          {unread > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-semibold text-white"
              style={{ background: "#c53030", height: 18 }}
            >
              {countLabel}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Content width="340px" align="end">
        <div className="flex items-center justify-between gap-2 pb-2">
          <Text size="2" weight="bold" style={{ color: "var(--mp-ink)" }}>
            Notifications
          </Text>
          {unread > 0 && (
            <Button size="1" variant="ghost" color="teal" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        {items.length === 0 ? (
          <Text size="2" as="p" style={{ color: "var(--mp-muted)" }}>
            You are all caught up.
          </Text>
        ) : (
          <ul className="m-0 flex max-h-[60vh] list-none flex-col gap-1 overflow-y-auto p-0">
            {items.map((item) => {
              const isUnread = seen !== null && !seenSet.has(item.id);
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 rounded-lg px-2 py-2 no-underline hover:bg-[var(--mp-primary-tint)]"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{
                        background: isUnread
                          ? "var(--mp-primary)"
                          : "var(--mp-paper-deep)",
                      }}
                    />
                    <span className="min-w-0">
                      <span
                        className="block text-sm"
                        style={{ color: "var(--mp-ink)" }}
                      >
                        {item.text}
                      </span>
                      {item.at && (
                        <span
                          className="block text-xs"
                          style={{ color: "var(--mp-muted)" }}
                        >
                          <RelativeTime iso={item.at} style="long" />
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Popover.Content>
    </Popover.Root>
  );
}
