import type { CodexDiffFile } from "./parse-diff";

export type DiffSummary = {
  fileCount: number;
  linesAdded: number;
  linesDeleted: number;
  hasChanges: boolean;
};

export function getDiffSummary(diffs: Array<CodexDiffFile>): DiffSummary {
  let linesAdded = 0;
  let linesDeleted = 0;
  for (const diff of diffs) {
    linesAdded += diff.additions;
    linesDeleted += diff.deletions;
  }
  const fileCount = diffs.length;
  const hasChanges = !(
    fileCount === 0 &&
    linesAdded === 0 &&
    linesDeleted === 0
  );
  return { fileCount, linesAdded, linesDeleted, hasChanges };
}
