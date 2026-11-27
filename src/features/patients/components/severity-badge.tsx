import { Badge } from "@radix-ui/themes";
import type { Severity } from "@/domain/entities";

/** Displays API-provided severity values consistently, e.g. "MILD" -> "Mild". */
export function severityLabel(severity: Severity) {
  return severity
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Badge variant="soft">{severityLabel(severity)}</Badge>;
}
