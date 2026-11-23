type Param = string | number | undefined;

/**
 * Builds `?a=1&b=2`-style text from params, skipping empty values. An array
 * repeats its key once per item, e.g. `providerIds=a&providerIds=b`.
 */
export function queryString(
  params: Record<string, Param | readonly Param[]>,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const items: readonly Param[] = typeof value === "object" ? value : [value];
    for (const item of items)
      if (item !== undefined && item !== "") query.append(key, String(item));
  }
  return query.toString();
}
