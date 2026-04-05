export function mergeUnifiedDiffs(
  parts: Array<string | null | undefined>,
): string | null {
  const sections: Array<string> = [];
  for (const part of parts) {
    if (part == null) {
      continue;
    }
    const normalized = stripTrailingNewlines(part);
    if (normalized.trim().length === 0) {
      continue;
    }
    sections.push(normalized);
  }
  if (sections.length === 0) {
    return null;
  }
  return sections.join("\n");
}

function stripTrailingNewlines(value: string): string {
  return value.replace(/[\r\n]+$/, "");
}
