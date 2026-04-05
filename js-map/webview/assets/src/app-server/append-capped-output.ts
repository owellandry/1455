export const DEFAULT_MAX_CAPPED_OUTPUT_CHARS = 20_000;

export function appendCappedOutput({
  current,
  delta,
  maxChars = DEFAULT_MAX_CAPPED_OUTPUT_CHARS,
}: {
  current: string;
  delta: string;
  maxChars?: number;
}): { next: string; didTruncate: boolean } {
  if (maxChars <= 0) {
    return { next: "", didTruncate: current.length > 0 || delta.length > 0 };
  }

  if (delta.length === 0) {
    return { next: current, didTruncate: current.length > maxChars };
  }

  if (delta.length >= maxChars) {
    return { next: delta.slice(-maxChars), didTruncate: true };
  }

  if (current.length + delta.length <= maxChars) {
    return { next: current + delta, didTruncate: false };
  }

  const preservedPrefixLen = maxChars - delta.length;
  const preserved =
    preservedPrefixLen > 0 ? current.slice(-preservedPrefixLen) : "";
  return { next: preserved + delta, didTruncate: true };
}
