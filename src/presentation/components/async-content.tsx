import { Card, Flex, Spinner, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";
import { ErrorCallout } from "./error-callout";

/** Renders loading / error / empty states around a data view. */
export function AsyncContent({
  loading,
  error,
  isEmpty,
  emptyText = "Nothing here yet.",
  onRetry,
  children,
}: {
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  emptyText?: string;
  onRetry?: () => void;
  children: ReactNode;
}) {
  if (error) return <ErrorCallout message={error} onRetry={onRetry} />;
  if (loading && isEmpty)
    return (
      <Flex justify="center" py="9">
        <Spinner size="3" />
      </Flex>
    );
  if (isEmpty)
    return (
      <Card>
        <Flex justify="center" py="6">
          <Text color="gray">{emptyText}</Text>
        </Flex>
      </Card>
    );
  return <>{children}</>;
}
