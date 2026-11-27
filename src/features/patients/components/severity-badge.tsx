import { Badge } from "@radix-ui/themes";

export function severityLabel(severity: string) {
  return severity
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function SeverityBadge({ severity }: { severity: string }) {
  return <Badge variant="soft">{severityLabel(severity)}</Badge>;
}
