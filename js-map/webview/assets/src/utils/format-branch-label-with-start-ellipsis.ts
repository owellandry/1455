export function formatBranchLabelWithStartEllipsis(
  branchName: string | null,
  maxCharacters: number,
): string {
  if (!branchName) {
    return "—";
  }

  return branchName.length > maxCharacters
    ? `…${branchName.slice(-maxCharacters)}`
    : branchName;
}
