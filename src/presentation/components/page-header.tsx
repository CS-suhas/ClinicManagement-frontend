import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <Flex justify="between" align="end" gap="4" wrap="wrap" mb="5">
      <Box>
        <Heading size="7">{title}</Heading>
        {description && (
          <Text as="p" color="gray" size="2" mt="1">
            {description}
          </Text>
        )}
      </Box>
      {actions && <Flex gap="2">{actions}</Flex>}
    </Flex>
  );
}
