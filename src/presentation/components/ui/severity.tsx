import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { SEVERITY_LEVELS } from "@/domain/entities";

export { highestSeverity, severityRank } from "@/domain/entities";

/**
 * Allergy severity. The API sends a free string, so every value goes through
 * `severityLevel`; anything unrecognised reads as UNKNOWN.
 */
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number] | "UNKNOWN";

export function severityLevel(
  severity: string | null | undefined,
): SeverityLevel {
  const value = (severity ?? "").trim().toUpperCase();
  return (SEVERITY_LEVELS as readonly string[]).includes(value)
    ? (value as SeverityLevel)
    : "UNKNOWN";
}

/** Display word, e.g. "Severe". */
export function severityWord(severity: string | null | undefined): string {
  const level = severityLevel(severity);
  if (level === "UNKNOWN") return (severity ?? "").trim() || "Not recorded";
  return level.charAt(0) + level.slice(1).toLowerCase();
}

/** Plain-language meaning for the allergy glance. */
export const SEVERITY_MEANING: Record<SeverityLevel, string> = {
  MILD: "Mild reactions, such as itching or a rash.",
  MODERATE: "Noticeable reactions that need treatment.",
  SEVERE: "Can be life-threatening. Treat with care.",
  UNKNOWN: "Severity has not been recorded.",
};

const SEVERITY_COLOR: Record<SeverityLevel, { dot: string; text: string }> = {
  MILD: { dot: "#d69e2e", text: "#8a5a00" },
  MODERATE: { dot: "#e0701a", text: "#9a4a00" },
  SEVERE: { dot: "#c53030", text: "#9b1c1c" },
  UNKNOWN: { dot: "#7b8c90", text: "#44565a" },
};

export function severityColors(severity: string | null | undefined) {
  return SEVERITY_COLOR[severityLevel(severity)];
}

/**
 * Coloured dot for a severity, with the word for screen readers. The top
 * severity also gets a warning triangle, so it never relies on colour alone.
 */
export function SeverityDot({
  severity,
  size = 8,
  showWord = false,
}: {
  severity: string | null | undefined;
  size?: number;
  /** Shows the word next to the dot instead of only for screen readers. */
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
