export type TextChunk = { text: string; isMatch: boolean };

/**
 * Compute highlight chunks for a given title and query.
 * Logic mirrors cmdk's filtering preference in a lightweight form:
 * - Prefer a contiguous, case-insensitive substring match when present.
 * - Otherwise, fall back to an ordered subsequence match (greedy, left-to-right).
 * - Empty query marks all characters as matches.
 */
export function computeHighlightChunks(
  title: string,
  query: string,
): Array<TextChunk> {
  const chars = Array.from(title);
  const q = query.trim();
  if (q.length === 0) {
    return chars.map((ch) => ({ text: ch, isMatch: true }));
  }

  const lowerTitle = title.toLowerCase();
  const lowerQuery = q.toLowerCase();

  // 1) Prefer contiguous substring match if present (strongest visual cue, aligns with higher cmdk score)
  const idx = lowerTitle.indexOf(lowerQuery);
  if (idx >= 0) {
    const start = idx;
    const end = idx + lowerQuery.length; // exclusive
    return chars.map((ch, i) => ({ text: ch, isMatch: i >= start && i < end }));
  }

  // 2) Fallback to ordered greedy subsequence matching (left-to-right)
  let qi = 0;
  return chars.map((ch) => {
    const isMatch =
      qi < lowerQuery.length && ch.toLowerCase() === lowerQuery[qi];
    if (isMatch) {
      qi += 1;
    }
    return { text: ch, isMatch };
  });
}
