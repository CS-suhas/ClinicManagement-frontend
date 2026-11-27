import { Flex, Spinner, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";
import { Surface } from "@/components/ui/surface";
import { ErrorCallout } from "./error-callout";

export function AsyncContent({
  loading,
  error,
  isEmpty,
  emptyText = "Nothing here yet.",
  empty,
  skeleton,
  onRetry,
  children,
}: {
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  emptyText?: string;
  empty?: ReactNode;
  skeleton?: ReactNode;
  onRetry?: () => void;
  children: ReactNode;
}) {
  if (error) return <ErrorCallout message={error} onRetry={onRetry} />;
  if (loading && isEmpty)
    return (
      skeleton ?? (
        <Flex justify="center" py="9">
          <Spinner size="3" />
        </Flex>
      )
    );
  if (isEmpty)
    return (
      empty ?? (
        <Surface>
          <Flex justify="center" py="6">
            <Text style={{ color: "var(--mp-muted)" }}>{emptyText}</Text>
          </Flex>
        </Surface>
      )
    );
  return (
    <div
      aria-busy={loading || undefined}
      className={`transition-opacity motion-reduce:transition-none ${loading ? "opacity-50" : "opacity-100"}`}
    >
      {children}
    </div>
  );
}
