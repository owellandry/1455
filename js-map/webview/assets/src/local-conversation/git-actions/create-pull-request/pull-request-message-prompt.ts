const MAX_CHANGE_LINES = 1000;
const MAX_FILE_LIST = 100;

export function buildPullRequestMessagePrompt({
  pullRequestInstructions,
  uncommittedDiff,
  filePaths,
  baseBranch,
  headBranch,
}: {
  pullRequestInstructions: string | null;
  uncommittedDiff: string | null;
  filePaths: Array<string>;
  baseBranch: string | null;
  headBranch: string | null;
}): string {
  const sections: Array<string> = [];
  if (baseBranch || headBranch) {
    sections.push(
      [
        "Branches:",
        `- Head: ${headBranch ?? "-"}`,
        `- Base: ${baseBranch ?? "-"}`,
      ].join("\n"),
    );
  }
  const trimmedInstructions = pullRequestInstructions?.trim() ?? "";
  if (trimmedInstructions.length > 0) {
    sections.push(
      `Pull request instructions (apply these to the title/body content only):\n${closeDanglingCodeFence(trimmedInstructions)}`,
    );
  }
  sections.push(
    buildChangesSection({
      uncommittedDiff,
      filePaths,
    }),
  );
  return sections.join("\n\n");
}

function buildChangesSection({
  uncommittedDiff,
  filePaths,
}: {
  uncommittedDiff: string | null;
  filePaths: Array<string>;
}): string {
  const trimmedDiff = uncommittedDiff?.trim() ?? "";
  const diffLineCount =
    trimmedDiff.length > 0 ? countDiffLines(trimmedDiff) : 0;
  const shouldListOnlyFiles = diffLineCount > MAX_CHANGE_LINES;
  const lines: Array<string> = ["Changes:"];
  if (trimmedDiff.length === 0 || shouldListOnlyFiles) {
    lines.push(formatFileList(filePaths));
    return lines.join("\n");
  }
  lines.push(trimmedDiff);
  return lines.join("\n");
}

function countDiffLines(diff: string): number {
  return diff.split(/\r?\n/).length;
}

function formatFileList(paths: Array<string>): string {
  if (paths.length === 0) {
    return "- (no files listed)";
  }
  const cappedPaths = paths.slice(0, MAX_FILE_LIST);
  const remaining = paths.length - cappedPaths.length;
  const lines = cappedPaths.map((path) => `- ${path}`);
  if (remaining > 0) {
    lines.push(`\u2026and ${remaining} more`);
  }
  return lines.join("\n");
}

function closeDanglingCodeFence(instructions: string): string {
  const fenceMatches = instructions.match(/```/g);
  if (fenceMatches == null || fenceMatches.length % 2 === 0) {
    return instructions;
  }
  return `${instructions}\n\`\`\``;
}
