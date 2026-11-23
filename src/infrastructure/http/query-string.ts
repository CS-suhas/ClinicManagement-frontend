type Param = string | number | undefined;

/** Builds `?a=1&b=2`-style text from params, skipping empty values. */
export function queryString(params: Record<string, Param>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (value !== undefined && value !== "") query.set(key, String(value));
  return query.toString();
}
