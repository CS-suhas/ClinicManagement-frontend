import { Flex, Spinner, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";
import { Surface } from "@/components/ui/surface";
import { ErrorCallout } from "./error-callout";

/**
 * Renders loading / error / empty states around a data view.
 * - First load (no rows yet): `skeleton` when given, otherwise a spinner.
 * - Reloading with rows on screen (e.g. a page change): the rows stay, dimmed.
 * - Empty: `empty` when given, otherwise a plain line of `emptyText`.
 */
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
  /** Replaces the default empty line, e.g. an EmptyState. */
  empty?: ReactNode;
  /** Shown instead of the spinner on first load, e.g. a TableSkeleton. */
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
