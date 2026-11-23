/** Only same-app paths are accepted, so ?next= cannot send people off-site. */
export function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/")) return "/dashboard";
  if (value.startsWith("//") || value.startsWith("/\\")) return "/dashboard";
  return value;
}
