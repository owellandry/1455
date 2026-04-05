export function stripLineInfoFromLabel(
  label: string,
  lineInfo: string | undefined,
): string {
  if (!lineInfo) {
    return label;
  }
  return label.replace(
    /(?:\s+\(\s*\d+(?:-\d+)?\s*\)|\s+\d+(?:-\d+)?)(\s*)$/,
    "",
  );
}
