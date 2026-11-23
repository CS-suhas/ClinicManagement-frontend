import { Surface } from "./surface";

/**
 * Column shapes for the skeleton, matching the real cells: "chip" is a circle
 * and a bar (an entity reference), "text" a long bar, "short" a small bar,
 * "number" a right-aligned small bar, "actions" two small circles.
 */
export type SkeletonCell = "chip" | "text" | "short" | "number" | "actions";

const BAR = "h-3 rounded-full motion-safe:animate-pulse";
const BAR_BG = { background: "var(--mp-paper-deep)" } as const;

function SkeletonCellContent({ shape }: { shape: SkeletonCell }) {
  if (shape === "chip")
    return (
      <span className="flex items-center gap-2">
        <span
          className="h-7 w-7 shrink-0 rounded-full motion-safe:animate-pulse"
          style={BAR_BG}
        />
        <span className={`${BAR} w-32`} style={BAR_BG} />
      </span>
    );
  if (shape === "actions")
    return (
      <span className="flex justify-end gap-2">
        <span
          className="h-6 w-6 rounded-full motion-safe:animate-pulse"
          style={BAR_BG}
        />
        <span
          className="h-6 w-6 rounded-full motion-safe:animate-pulse"
          style={BAR_BG}
        />
      </span>
    );
  const width = shape === "text" ? "w-48" : shape === "short" ? "w-16" : "w-12";
  return (
    <span
      className={`${BAR} ${width} ${shape === "number" ? "ml-auto block" : "block"}`}
      style={BAR_BG}
    />
  );
}

/**
 * Placeholder rows shaped like a DataTable while its first page loads. Use it
 * as AsyncContent's `skeleton` so the layout does not jump when data arrives.
 */
export function TableSkeleton({
  columns,
  rows = 8,
  selectable = false,
  expandable = false,
}: {
  columns: SkeletonCell[];
  rows?: number;
  /** Adds the checkbox column. */
  selectable?: boolean;
  /** Adds the chevron column. */
  expandable?: boolean;
}) {
  const cellClass = "px-4 py-3 align-middle";
  return (
    <Surface padding="none" className="overflow-hidden" aria-busy="true">
      <output className="sr-only">Loading…</output>
      <table className="w-full border-collapse">
        <tbody>
          {Array.from({ length: rows }, (_, row) => (
            <tr
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows never reorder
              key={row}
              className="border-t"
              style={{ borderColor: "var(--mp-paper-deep)" }}
            >
              {selectable && (
                <td className={cellClass} style={{ width: 40 }}>
                  <span
                    className="block h-4 w-4 rounded motion-safe:animate-pulse"
                    style={BAR_BG}
                  />
                </td>
              )}
              {expandable && (
                <td className={cellClass} style={{ width: 40 }}>
                  <span
                    className="block h-4 w-4 rounded motion-safe:animate-pulse"
                    style={BAR_BG}
                  />
                </td>
              )}
              {columns.map((shape, column) => (
                <td
                  // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder columns never reorder
                  key={column}
                  className={cellClass}
                >
                  <SkeletonCellContent shape={shape} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Surface>
  );
}
