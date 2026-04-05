const MAX_TITLE_WORD_COUNT = 5;

export function getDefaultBranchName({
  branchPrefix,
  conversationTitle,
}: {
  branchPrefix: string | undefined;
  conversationTitle: string | null | undefined;
}): string {
  const resolvedBranchPrefix = branchPrefix?.trim() ?? "";
  const titleSlug = slugifyBranchTitle(conversationTitle);
  if (titleSlug.length === 0) {
    return resolvedBranchPrefix;
  }
  return `${resolvedBranchPrefix}${titleSlug}`;
}

export function slugifyBranchTitle(
  conversationTitle: string | null | undefined,
): string {
  if (!conversationTitle) {
    return "";
  }
  return conversationTitle
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .slice(0, MAX_TITLE_WORD_COUNT)
    .map((word) => word.replace(/[^a-z0-9]/g, ""))
    .filter((word) => word.length > 0)
    .join("-");
}
