import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { z } from "zod";

export const Severity = z.enum(["MILD", "MODERATE", "SEVERE"]);
export type SeverityLevel = z.infer<typeof Severity> | "UNKNOWN";

export function severityRank(severity: string | null | undefined) {
  const parsed = Severity.safeParse((severity ?? "").trim().toUpperCase());
  return parsed.success ? Severity.options.indexOf(parsed.data) + 1 : 0;
}

export function highestSeverity(
  severities: readonly (string | null | undefined)[],
) {
  let best: string | null = null;
  for (const severity of severities) {
    if (best === null || severityRank(severity) > severityRank(best))
      best = severity ?? null;
  }
  return best;
}

export function severityLevel(
  severity: string | null | undefined,
): SeverityLevel {
  const value = (severity ?? "").trim().toUpperCase();
  return Severity.safeParse(value).success
    ? (value as SeverityLevel)
    : "UNKNOWN";
}

export function severityWord(severity: string | null | undefined): string {
  const level = severityLevel(severity);
  if (level === "UNKNOWN") return (severity ?? "").trim() || "Not recorded";
  return level.charAt(0) + level.slice(1).toLowerCase();
}

export const SEVERITY_MEANING: Record<SeverityLevel, string> = {
  MILD: "Mild reactions, such as itching or a rash.",
  MODERATE: "Noticeable reactions that need treatment.",
  SEVERE: "Can be life-threatening. Treat with care.",
  UNKNOWN: "Severity has not been recorded.",
};

const SEVERITY_COLOR: Record<SeverityLevel, { dot: string; text: string }> = {
  MILD: { dot: "#d69e2e", text: "var(--mp-amber-ink)" },
  MODERATE: { dot: "#e0701a", text: "var(--mp-orange-ink)" },
  SEVERE: { dot: "#c53030", text: "var(--mp-red-ink)" },
  UNKNOWN: { dot: "#7b8c90", text: "var(--mp-slate-ink)" },
};

export function severityColors(severity: string | null | undefined) {
  return SEVERITY_COLOR[severityLevel(severity)];
}

export function SeverityDot({
  severity,
  size = 8,
  showWord = false,
}: {
  severity: string | null | undefined;
  size?: number;
  showWord?: boolean;
}) {
  const word = severityWord(severity);
  const colors = severityColors(severity);
  const level = severityLevel(severity);
  return (
    <span className="inline-flex items-center gap-1.5">
      {level === "SEVERE" ? (
        <ExclamationTriangleIcon
          aria-hidden="true"
          width={size + 4}
          height={size + 4}
          style={{ color: colors.dot }}
        />
      ) : (
        <span
          aria-hidden="true"
          className="inline-block shrink-0 rounded-full"
          style={{ width: size, height: size, background: colors.dot }}
        />
      )}
      {showWord ? (
        <span
          className="text-[13px] font-medium"
          style={{ color: colors.text }}
        >
          {word}
        </span>
      ) : (
        <span className="sr-only">{word} severity</span>
      )}
    </span>
  );
}
