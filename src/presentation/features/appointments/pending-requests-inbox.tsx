"use client";

import { Flex, Text } from "@radix-ui/themes";
import type { AppointmentScope } from "@/application/services/appointment-service";
import type { AppointmentAction } from "@/domain/entities";
import type { AppointmentListItem } from "@/domain/repositories";
import { ErrorCallout } from "@/presentation/components/error-callout";
import { RelativeTime } from "@/presentation/components/ui/relative-time";
import { Surface } from "@/presentation/components/ui/surface";
import { ActionButtons, Party, timeSpan } from "./appointment-parts";

/** Doctor's inbox of visits waiting for accept or reject, at the top of the page. */
export function PendingRequestsInbox({
  items,
  more,
  loading,
  error,
  onRetry,
  scope,
  actionsFor,
  onAct,
  duration,
}: {
  items: AppointmentListItem[];
  /** The server has more than the inbox shows. */
  more: boolean;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  scope: AppointmentScope;
  actionsFor: (item: AppointmentListItem) => AppointmentAction[];
  onAct: (item: AppointmentListItem, action: AppointmentAction) => void;
  duration: number;
}) {
  return (
    <Surface padding="md" aria-labelledby="pending-requests-title">
      <Flex align="center" justify="between" mb="3" gap="2" wrap="wrap">
        <Flex align="center" gap="2">
          <h2
            id="pending-requests-title"
            className="m-0 text-base font-semibold"
            style={{ color: "var(--mp-ink)" }}
          >
            Pending requests
          </h2>
          <span
            className="inline-flex min-w-6 items-center justify-center rounded-full px-2 text-xs font-semibold"
            style={{ background: "#fdf3dc", color: "#7a4f00" }}
          >
            {more ? `${items.length}+` : items.length}
          </span>
        </Flex>
        <Text size="2" style={{ color: "var(--mp-muted)" }}>
          Accept or reject patients' requests from today on.
        </Text>
      </Flex>

      {error && <ErrorCallout message={error} onRetry={onRetry} />}
      {!error && !loading && items.length === 0 && (
        <Text
          as="p"
          size="2"
          style={{ color: "var(--mp-muted)" }}
          className="m-0"
        >
          No requests are waiting for you.
        </Text>
      )}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center gap-3 rounded-xl p-3"
            style={{ background: "var(--mp-paper)" }}
          >
            <div className="min-w-0 flex-1">
              <div
                className="text-sm font-semibold tabular-nums"
                style={{ color: "var(--mp-ink)" }}
              >
                {timeSpan(item.appointmentDateTime, duration)}{" "}
                <span
                  className="font-normal"
                  style={{ color: "var(--mp-muted)" }}
                >
                  · <RelativeTime iso={item.appointmentDateTime} />
                </span>
              </div>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
                <Party item={item} scope={scope} />
                {item.reasonForVisit && (
                  <span
                    className="min-w-0 truncate text-xs"
                    style={{ color: "var(--mp-muted)" }}
                  >
                    {item.reasonForVisit}
                  </span>
                )}
              </div>
            </div>
            <ActionButtons
              size="1"
              item={item}
              actions={actionsFor(item)}
              onAct={onAct}
            />
          </li>
        ))}
      </ul>
    </Surface>
  );
}
