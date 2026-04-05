/** Returns a display-friendly project name from a path or label override. */
export function getProjectName(
  path: string | null | undefined,
  labelOverride?: string | null,
): string | null {
  if (labelOverride && labelOverride.trim().length > 0) {
    return sanitize(labelOverride);
  }
  if (!path) {
    return null;
  }
  const normalized = path.trim();
  if (!normalized) {
    return null;
  }
  const segments = normalized.split(/[/\\]+/).filter(Boolean);
  const leaf = segments[segments.length - 1] ?? normalized;
  return sanitize(leaf);
}

function sanitize(name: string): string {
  const trimmed = name.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length <= 3) {
    return trimmed;
  }
  return words.slice(0, 3).join(" ");
}
