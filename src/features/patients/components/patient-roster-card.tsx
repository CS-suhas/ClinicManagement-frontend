"use client";

import { MixerHorizontalIcon, PlusIcon } from "@radix-ui/react-icons";
import {
  Button,
  Flex,
  Heading,
  IconButton,
  Text,
  Tooltip,
} from "@radix-ui/themes";
import type { ReactNode } from "react";
import { SearchField } from "@/components/search-field";
import { Surface } from "@/components/ui/surface";

/**
 * White card holding a patients table: a header bar with the title and the
 * search, filter and add controls, then the body and an optional footer.
 */
export function PatientRosterCard({
  title,
  subtitle,
  query,
  onQueryChange,
  searchPlaceholder,
  onAdd,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  query: string;
  onQueryChange: (query: string) => void;
  searchPlaceholder: string;
  /** Shows the "Add Patient" button when given. */
  onAdd?: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Surface padding="none" className="overflow-hidden">
      <Flex
        align="center"
        justify="between"
        wrap="wrap"
        gap="3"
        px="5"
        py="4"
        style={{ borderBottom: "1px solid var(--mp-paper-deep)" }}
      >
        <div className="min-w-0">
          <Heading as="h1" size="5" style={{ color: "var(--mp-ink)" }}>
            {title}
          </Heading>
          {subtitle && (
            <Text as="p" size="2" mt="1" style={{ color: "var(--mp-muted)" }}>
              {subtitle}
            </Text>
          )}
        </div>
        <Flex align="center" gap="2" wrap="wrap">
          <SearchField
            value={query}
            onChange={onQueryChange}
            placeholder={searchPlaceholder}
          />
          <Tooltip content="No filters available yet">
            <span className="inline-flex">
              <IconButton
                variant="soft"
                color="gray"
                disabled
                aria-label="Filters (not available yet)"
              >
                <MixerHorizontalIcon />
              </IconButton>
            </span>
          </Tooltip>
          {onAdd && (
            <Button color="teal" onClick={onAdd}>
              <PlusIcon /> Add Patient
            </Button>
          )}
        </Flex>
      </Flex>

      {children}

      {footer && <div className="px-5 pb-4">{footer}</div>}
    </Surface>
  );
}
