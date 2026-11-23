/** Colour names used for statuses. Always pair with text, never colour alone. */
export type StatusTone = "amber" | "teal" | "red" | "slate" | "blue";

export const STATUS_TONE_COLOR: Record<StatusTone, string> = {
  amber: "#b7791f",
  teal: "var(--mp-primary)",
  red: "#c53030",
  slate: "#64748b",
  blue: "#2b6cb0",
};

/**
 * 8 px status dot. The label is read by screen readers ("Pending"), so the
 * meaning survives without colour.
 */
export function StatusDot({
  tone,
  label,
  pulse = false,
}: {
  tone: StatusTone;
  label: string;
  /** Gentle pulse for "happening now" states; disabled under reduced motion. */
  pulse?: boolean;
}) {
  return (
    <>
      <span
        aria-hidden="true"
        className={`inline-block h-2 w-2 shrink-0 rounded-full ${
          pulse ? "motion-safe:animate-pulse" : ""
        }`}
        style={{ background: STATUS_TONE_COLOR[tone] }}
      />
      <span className="sr-only">{label}</span>
    </>
  );
}
