/** Soft background/text pairs; a name always maps to the same pair. */
const TONES = [
  { background: "var(--mp-primary-tint)", color: "var(--mp-primary-dark)" },
  { background: "#e4eefb", color: "#1f4e8c" },
  { background: "#fcf0dc", color: "#8a5a00" },
  { background: "#fbe6ec", color: "#9b2c4f" },
  { background: "#ece8fb", color: "#5b3fb0" },
  { background: "#e3f4e8", color: "#1f6b35" },
] as const;

/** Up to two initials; a leading "Dr." is ignored. */
export function initialsOf(name: string): string {
  return name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function hashOf(text: string): number {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

/** Initials in a soft circle. The API has no photos, so the colour is derived from the name. */
export function PersonAvatar({
  name,
  size = 40,
}: {
  name: string;
  size?: number;
}) {
  const tone = TONES[hashOf(name) % TONES.length];
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        letterSpacing: "-0.02em",
        ...tone,
      }}
    >
      {initialsOf(name)}
    </span>
  );
}
