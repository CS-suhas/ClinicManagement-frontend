import {
  ArchiveIcon,
  Cross2Icon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import { Button, Flex, Heading, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";
import { IconCircle } from "./icon-circle";
import { Surface } from "./surface";

export type ActiveFilter = {
  id: string;
  label: string;
};

export function EmptyState({
  title,
  description,
  action,
  variant = "empty",
  icon,
  filters,
  onRemoveFilter,
  onClearFilters,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: "empty" | "no-matches";
  icon?: ReactNode;
  filters?: ActiveFilter[];
  onRemoveFilter?: (id: string) => void;
  onClearFilters?: () => void;
}) {
  const noMatches = variant === "no-matches";
  return (
    <Surface padding="lg" className="flex flex-col items-center text-center">
      <Flex direction="column" align="center" gap="3" py="4" maxWidth="28rem">
        <IconCircle size={48}>
          {icon ??
            (noMatches ? (
              <MagnifyingGlassIcon width={22} height={22} />
            ) : (
              <ArchiveIcon width={22} height={22} />
            ))}
        </IconCircle>
        <Heading as="h2" size="4" style={{ color: "var(--mp-ink)" }}>
          {title}
        </Heading>
        {description && (
          <Text size="2" style={{ color: "var(--mp-muted)" }}>
            {description}
          </Text>
        )}
        {noMatches && filters && filters.length > 0 && (
          <ul
            className="flex flex-wrap justify-center gap-2"
            aria-label="Active filters"
          >
            {filters.map((filter) => (
              <li key={filter.id}>
                <button
                  type="button"
                  aria-label={`Remove filter ${filter.label}`}
                  onClick={() => onRemoveFilter?.(filter.id)}
                  className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mp-ink)]"
                  style={{
                    background: "var(--mp-primary-tint)",
                    color: "var(--mp-ink)",
                  }}
                >
                  {filter.label}
                  <Cross2Icon aria-hidden="true" width={12} height={12} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <Flex gap="2" wrap="wrap" justify="center">
          {noMatches && onClearFilters && (
            <Button variant="soft" color="gray" onClick={onClearFilters}>
              Clear filters
            </Button>
          )}
          {action}
        </Flex>
      </Flex>
    </Surface>
  );
}
