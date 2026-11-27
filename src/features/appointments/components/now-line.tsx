export function NowLine({ top, left }: { top: number; left: number }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute right-0 z-10 flex items-center"
      style={{ top, left: left - 5 }}
    >
      <span
        className="size-2.5 shrink-0 rounded-full"
        style={{ background: "var(--mp-primary)" }}
      />
      <span
        className="h-0.5 flex-1"
        style={{ background: "var(--mp-primary)" }}
      />
    </div>
  );
}
