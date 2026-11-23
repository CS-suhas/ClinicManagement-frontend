"use client";

import { Button, Flex, Text } from "@radix-ui/themes";

export function PaginationControls({
  page,
  pageSize,
  totalCount,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const firstItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalCount);

  return (
    <Flex justify="between" align="center" mt="3" gap="3">
      <Text size="2" color="gray">
        {firstItem}–{lastItem} of {totalCount}
      </Text>
      <Flex gap="2">
        <Button
          variant="soft"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="soft"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </Flex>
    </Flex>
  );
}
