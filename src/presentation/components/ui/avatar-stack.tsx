import { PersonAvatar } from "./person-avatar";

/**
 * Overlapping 24 px avatars with a "+N" overflow. Presentational: wrap it in a
 * GlancePopover trigger to list everyone as chips on hover, tap or Enter.
 */
export function AvatarStack({
  people,
  max = 3,
  size = 24,
}: {
  people: { name: string }[];
  /** Avatars shown before the "+N" overflow. */
  max?: number;
  size?: number;
}) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <span className="inline-flex items-center">
      <span className="sr-only">{people.map((p) => p.name).join(", ")}</span>
      {shown.map((person, index) => (
        <span
          key={`${person.name}-${index}`}
          className="inline-flex rounded-full bg-[var(--mp-surface)]"
          style={{
            marginLeft: index === 0 ? 0 : -Math.round(size / 4),
            boxShadow: "0 0 0 2px var(--mp-surface)",
          }}
        >
          <PersonAvatar name={person.name} size={size} />
        </span>
      ))}
      {extra > 0 && (
        <span
          aria-hidden="true"
          className="inline-flex items-center justify-center rounded-full text-[11px] font-semibold"
          style={{
            width: size,
            height: size,
            marginLeft: -Math.round(size / 4),
            background: "var(--mp-paper)",
            color: "var(--mp-muted)",
            boxShadow: "0 0 0 2px var(--mp-surface)",
          }}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}
