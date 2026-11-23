export const formatDate = (iso: string) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" })
    : "";

export const formatDateTime = (iso: string) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";

/** Converts an ISO string to the value format of <input type="datetime-local">. */
export const toDateTimeLocal = (iso: string) => (iso ? iso.slice(0, 16) : "");

/**
 * Plain consultation-fee amount with 2 decimals, e.g. "1,250.50". No currency
 * symbol yet: add it here when the API gains a currency field.
 */
export function formatFee(fee: number | null | undefined) {
  if (fee == null) return "—";
  return fee.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Case-insensitive "any field contains query" filter for table search boxes. */
export function matchesQuery(query: string, ...fields: (string | undefined)[]) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f?.toLowerCase().includes(q));
}
