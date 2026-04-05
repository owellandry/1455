export function containsQuery(
  value: string | null | undefined,
  query: string,
): boolean {
  return typeof value === "string" && value.toLowerCase().includes(query);
}
