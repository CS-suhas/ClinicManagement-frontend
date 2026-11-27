export const formatTime = (iso: string) =>
  iso
    ? new Date(iso).toLocaleTimeString(undefined, { timeStyle: "short" })
    : "";

export const EMPTY_CELL = "—";
