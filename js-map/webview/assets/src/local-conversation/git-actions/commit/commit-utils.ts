import type { GitDiff } from "protocol";

import type { CodexDiffFile } from "@/diff/parse-diff";

import type { CommitDiffSummary, CommitFileSummary } from "./commit-types";

export function getUnifiedDiff(diff?: GitDiff | null): string | null {
  if (!diff || diff.type !== "success") {
    return null;
  }
  return diff.unifiedDiff;
}

export function summarizeFiles(files: Array<CodexDiffFile>): CommitDiffSummary {
  const map = new Map<string, CommitFileSummary>();
  let totalAdditions = 0;
  let totalDeletions = 0;

  for (const file of files) {
    const path = file.metadata.name;
    const additions = file.additions ?? 0;
    const deletions = file.deletions ?? 0;
    totalAdditions += additions;
    totalDeletions += deletions;
    const existing = map.get(path);
    if (existing) {
      existing.additions += additions;
      existing.deletions += deletions;
      continue;
    }
    map.set(path, { path, additions, deletions });
  }

  const mergedFiles = Array.from(map.values()).sort((a, b) =>
    a.path.localeCompare(b.path),
  );
  return { files: mergedFiles, totalAdditions, totalDeletions };
}

export function summarizeUnifiedDiff(diff: string | null): {
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
} | null {
  if (diff == null || diff.trim().length === 0) {
    return null;
  }

  let filesChanged = 0;
  let linesAdded = 0;
  let linesRemoved = 0;

  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith("diff --git ")) {
      filesChanged += 1;
      continue;
    }
    if (line.startsWith("+++") || line.startsWith("---")) {
      continue;
    }
    if (line.startsWith("+")) {
      linesAdded += 1;
      continue;
    }
    if (line.startsWith("-")) {
      linesRemoved += 1;
    }
  }

  return { filesChanged, linesAdded, linesRemoved };
}
