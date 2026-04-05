import type { FileDiffMetadata } from "@pierre/diffs";

type FileDiffMetadataForBudget = Pick<
  FileDiffMetadata,
  "hunks" | "additionLines" | "deletionLines"
>;

const ONE_MEGABYTE = 1024 * 1024;
const CHANGED_LINE_BYTE_STATS_CACHE = new WeakMap<
  FileDiffMetadataForBudget,
  { changedBytes: number; maxChangedLineBytes: number }
>();

// Keep historical behavior as the default file-count cap.
export const MAX_SINGLE_FILE_REVIEW_FILES = 128;
// Global line budget to avoid multi-file review rendering/search lag.
export const MAX_SINGLE_FILE_REVIEW_CHANGED_LINES = 9000;
// Global byte budget to catch wide diffs that line counts miss.
export const MAX_SINGLE_FILE_REVIEW_CHANGED_BYTES = 12 * ONE_MEGABYTE;
// Per-file line guard so one file cannot dominate rendering cost.
export const MAX_RENDERABLE_FILE_CHANGED_LINES = 15000;
// Per-file byte guard for large minified/serialized blobs.
export const MAX_RENDERABLE_FILE_CHANGED_BYTES = 3 * ONE_MEGABYTE;
// Per-line byte guard for extremely long single changed lines
// (for example a huge JSON blob on one line).
export const MAX_RENDERABLE_FILE_MAX_LINE_BYTES = ONE_MEGABYTE;

export function shouldUseSingleFileReviewMode({
  fileCount,
  totalChangedLines,
  totalChangedBytes,
}: {
  fileCount: number;
  totalChangedLines: number;
  totalChangedBytes: number;
}): boolean {
  return (
    fileCount > MAX_SINGLE_FILE_REVIEW_FILES ||
    totalChangedLines > MAX_SINGLE_FILE_REVIEW_CHANGED_LINES ||
    totalChangedBytes > MAX_SINGLE_FILE_REVIEW_CHANGED_BYTES
  );
}

export function exceedsFileRenderBudget(diff: {
  additions: number;
  deletions: number;
  changedBytes: number;
  maxChangedLineBytes: number;
}): boolean {
  return (
    diff.additions + diff.deletions > MAX_RENDERABLE_FILE_CHANGED_LINES ||
    diff.changedBytes > MAX_RENDERABLE_FILE_CHANGED_BYTES ||
    diff.maxChangedLineBytes > MAX_RENDERABLE_FILE_MAX_LINE_BYTES
  );
}

export function exceedsFileRenderBudgetForMetadata(
  metadata: FileDiffMetadataForBudget,
): boolean {
  const changedLineCount = metadata.hunks.reduce(
    (sum, hunk) => sum + hunk.additionLines + hunk.deletionLines,
    0,
  );
  if (changedLineCount > MAX_RENDERABLE_FILE_CHANGED_LINES) {
    return true;
  }

  const { changedBytes, maxChangedLineBytes } =
    getChangedLineByteStats(metadata);
  return (
    changedBytes > MAX_RENDERABLE_FILE_CHANGED_BYTES ||
    maxChangedLineBytes > MAX_RENDERABLE_FILE_MAX_LINE_BYTES
  );
}

export function getChangedLineByteStats(metadata: FileDiffMetadataForBudget): {
  changedBytes: number;
  maxChangedLineBytes: number;
} {
  const cachedStats = CHANGED_LINE_BYTE_STATS_CACHE.get(metadata);
  if (cachedStats != null) {
    return cachedStats;
  }

  let changedBytes = 0;
  let maxChangedLineBytes = 0;

  for (const hunk of metadata.hunks) {
    for (const item of hunk.hunkContent) {
      if (item.type === "context") {
        continue;
      }

      const deletionLineStart = item.deletionLineIndex;
      const deletionLineEnd = deletionLineStart + item.deletions;
      for (
        let deletionLineIndex = deletionLineStart;
        deletionLineIndex < deletionLineEnd;
        deletionLineIndex += 1
      ) {
        const lineLength =
          metadata.deletionLines[deletionLineIndex]?.length ?? 0;
        changedBytes += lineLength;
        maxChangedLineBytes = Math.max(maxChangedLineBytes, lineLength);
      }

      const additionLineStart = item.additionLineIndex;
      const additionLineEnd = additionLineStart + item.additions;
      for (
        let additionLineIndex = additionLineStart;
        additionLineIndex < additionLineEnd;
        additionLineIndex += 1
      ) {
        const lineLength =
          metadata.additionLines[additionLineIndex]?.length ?? 0;
        changedBytes += lineLength;
        maxChangedLineBytes = Math.max(maxChangedLineBytes, lineLength);
      }
    }
  }

  const stats = { changedBytes, maxChangedLineBytes };
  CHANGED_LINE_BYTE_STATS_CACHE.set(metadata, stats);
  return stats;
}
