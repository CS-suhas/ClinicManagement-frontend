import { Heading, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <Heading as="h1" size="6" style={{ color: "var(--mp-ink)" }}>
          {title}
        </Heading>
        {subtitle && (
          <Text as="p" size="2" mt="1" style={{ color: "var(--mp-muted)" }}>
            {subtitle}
          </Text>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
