import { Flex, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";

export function FormField({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <Flex direction="column" gap="1">
      <Text as="label" htmlFor={htmlFor} size="2" weight="medium">
        {label}
      </Text>
      {children}
      {error && (
        <Text size="1" color="red" role="alert">
          {error}
        </Text>
      )}
    </Flex>
  );
}
