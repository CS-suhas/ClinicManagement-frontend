import { Badge } from "@radix-ui/themes";
import type { Severity } from "@/domain/entities";

export function severityLabel(severity: Severity) {
  return severity
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Badge variant="soft">{severityLabel(severity)}</Badge>;
}
