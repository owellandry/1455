export function stripFrontmatter(value: string): string {
  if (!value.startsWith("---\n")) {
    return value;
  }
  const endIndex = value.indexOf("\n---", 4);
  if (endIndex === -1) {
    return value;
  }
  const after = value.slice(endIndex + "\n---".length);
  return after.startsWith("\n") ? after.slice(1) : after;
}
