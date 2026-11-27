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

export const toDateTimeLocal = (iso: string) => (iso ? iso.slice(0, 16) : "");

export const FEE_CURRENCY = "LKR";

export function formatFee(fee: number | null | undefined) {
  if (fee == null) return "—";
  return `${FEE_CURRENCY} ${fee.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const formatFeeShort = (fee: number) =>
  `${FEE_CURRENCY} ${fee.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
