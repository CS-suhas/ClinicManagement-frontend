const TONES = [
  { background: "var(--mp-primary-tint)", color: "var(--mp-primary-dark)" },
  { background: "var(--mp-blue-bg)", color: "var(--mp-blue-ink)" },
  { background: "var(--mp-amber-bg)", color: "var(--mp-amber-ink)" },
  { background: "var(--mp-pink-bg)", color: "var(--mp-pink-ink)" },
  { background: "var(--mp-violet-bg)", color: "var(--mp-violet-ink)" },
  { background: "var(--mp-green-bg)", color: "var(--mp-green-ink)" },
] as const;

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
