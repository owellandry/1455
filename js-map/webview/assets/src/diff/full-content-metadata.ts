import type { FileDiffMetadata, Hunk } from "@pierre/diffs";
import type { GitCatFileResult } from "protocol";

export function emptyCatFileResult(): GitCatFileResult {
  return { type: "success", lines: [] };
}

export function createFullMetadata(
  metadata: FileDiffMetadata,
  prevLines: Array<string>,
  nextLines: Array<string>,
): FileDiffMetadata {
  const hunks = rebaseHunksForFullContent(metadata.hunks);
  return {
    ...metadata,
    hunks,
    isPartial: false,
    deletionLines: prevLines,
    additionLines: nextLines,
    cacheKey: `${metadata.cacheKey ?? metadata.name}:full:${metadata.prevObjectId ?? "none"}:${metadata.newObjectId ?? "none"}`,
  };
}

/**
 * Recomputes hunk offsets and collapsed gaps for full-file content.
 *
 * Partial diffs are anchored to the visible hunks, so when we hydrate with the
 * full file we need to shift each hunk by the number of lines that were
 * previously collapsed. The gap and end tracking uses the larger of the
 * addition and deletion ranges so deletion-heavy hunks do not under count.
 */
export function rebaseHunksForFullContent(hunks: Array<Hunk>): Array<Hunk> {
  const rebasedHunks = hunks.map((hunk) => {
    const additionStartIndex = Math.max(hunk.additionStart - 1, 0);
    const deletionStartIndex = Math.max(hunk.deletionStart - 1, 0);
    let nextAdditionIndex = additionStartIndex;
    let nextDeletionIndex = deletionStartIndex;

    const hunkContent = hunk.hunkContent.map(
      (content: Hunk["hunkContent"][number]) => {
        const newContent = {
          ...content,
          additionLineIndex: nextAdditionIndex,
          deletionLineIndex: nextDeletionIndex,
        };
        if (newContent.type === "context") {
          nextAdditionIndex += newContent.lines;
          nextDeletionIndex += newContent.lines;
        } else {
          nextAdditionIndex += newContent.additions;
          nextDeletionIndex += newContent.deletions;
        }
        return newContent;
      },
    );

    const rebasedHunk = {
      ...hunk,
      additionLineIndex: additionStartIndex,
      deletionLineIndex: deletionStartIndex,
      hunkContent,
    };

    return rebasedHunk;
  });

  return rebasedHunks;
}
