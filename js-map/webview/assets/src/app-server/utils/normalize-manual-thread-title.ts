export function normalizeManualThreadTitle(
  rawTitle: string,
  maxChars: number,
): string | null {
  const trimmed = rawTitle.trim().replace(/\s+/g, " ");
  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length <= maxChars) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxChars - 1).trimEnd()}…`;
}
