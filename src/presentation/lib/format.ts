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

/** Fees are Sri Lankan rupees; the API sends plain amounts. */
export const FEE_CURRENCY = "LKR";

/** Consultation fee, e.g. "LKR 1,250.50". */
export function formatFee(fee: number | null | undefined) {
  if (fee == null) return "—";
  return `${FEE_CURRENCY} ${fee.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Compact amount for tight spaces such as slider labels, e.g. "LKR 2,500". */
export const formatFeeShort = (fee: number) =>
  `${FEE_CURRENCY} ${fee.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

/** Case-insensitive "any field contains query" filter for table search boxes. */
export function matchesQuery(query: string, ...fields: (string | undefined)[]) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f?.toLowerCase().includes(q));
}
