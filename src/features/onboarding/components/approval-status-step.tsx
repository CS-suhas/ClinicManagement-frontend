"use client";

import { Button, Flex, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusPill } from "@/components/glance";
import { Surface } from "@/components/ui/surface";
import { useService } from "@/di/container-provider";

/** How often a waiting doctor's status is checked in the background. */
export const APPROVAL_POLL_MS = 30_000;

/**
 * Where a doctor application stands. While it is PENDING the session is
 * checked every 30 s and the flow moves on as soon as an administrator decides.
 * A REJECTED application has no form to resubmit; the copy says whom to contact.
 */
export function ApprovalStatusStep({
  status,
  onRefresh,
}: {
  status: "PENDING" | "REJECTED";
  onRefresh: () => Promise<void>;
}) {
  const authService = useService("authService");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (status !== "PENDING") return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      authService
        .getCurrentUser()
        .then((current) => {
          // Re-reading the session is quiet; the flow only refreshes when the status moved.
          if (current?.provider?.verificationStatus !== "PENDING")
            void onRefresh();
        })
        .catch(() => {
          // A failed background check is retried on the next tick.
        });
    }, APPROVAL_POLL_MS);
    return () => window.clearInterval(timer);
  }, [status, authService, onRefresh]);

  const check = async () => {
    setChecking(true);
    try {
      await onRefresh();
    } finally {
      setChecking(false);
    }
  };

  if (status === "REJECTED") {
    return (
      <Surface padding="md" style={{ borderColor: "var(--mp-red-line)" }}>
        <Flex direction="column" gap="3" align="start">
          <StatusPill kind="verification" status="REJECTED" />
          <Text size="2" style={{ color: "var(--mp-ink)" }}>
            Your application was not approved. Contact your clinic administrator
            for details.
          </Text>
          <Text size="1" style={{ color: "var(--mp-muted)" }}>
            You cannot resubmit from here. An administrator can re-verify an
            application.
          </Text>
          <Button asChild variant="soft" color="gray">
            <Link href="/doctors">Browse doctors</Link>
          </Button>
        </Flex>
      </Surface>
    );
  }

  return (
    <Flex direction="column" gap="4">
      <Flex direction="column" gap="3" align="start">
        <StatusPill kind="verification" status="PENDING" />
        <Text size="2" style={{ color: "var(--mp-ink)" }}>
          An administrator will review your details. The result appears here and
          in your notifications.
        </Text>
      </Flex>
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {["Submitted", "In review", "Approved"].map((label, index) => (
          <li
            key={label}
            aria-current={index === 1 ? "step" : undefined}
            className="flex items-center gap-2 text-sm"
            style={{
              color: index <= 1 ? "var(--mp-ink)" : "var(--mp-muted)",
              fontWeight: index === 1 ? 600 : 400,
            }}
          >
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 rounded-full"
              style={{
                background:
                  index === 0
                    ? "var(--mp-primary)"
                    : index === 1
                      ? "#b7791f"
                      : "var(--mp-paper-deep)",
              }}
            />
            {label}
            {index === 0 && <span className="sr-only">(done)</span>}
          </li>
        ))}
      </ol>
      <Flex gap="2" wrap="wrap">
        <Button
          type="button"
          variant="soft"
          color="teal"
          loading={checking}
          onClick={() => void check()}
        >
          Check status
        </Button>
        <Button asChild variant="soft" color="gray">
          <Link href="/doctors">Browse doctors</Link>
        </Button>
      </Flex>
    </Flex>
  );
}
