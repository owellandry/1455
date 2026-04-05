import { parsePatchFiles, type FileDiffMetadata } from "@pierre/diffs";
import sumBy from "lodash/sumBy";
import type { TaskAssistantTurn } from "protocol";

import { logger } from "../utils/logger";
import { getOutputDiffTexts } from "../utils/task-turn-utils";
import { NULL_FILE } from "./diff-file-utils";
import { getChangedLineByteStats } from "./diff-render-budgets";

// Cache parsed diffs by assistant turn and requested maxFiles. Having separate
// entries for different maxFiles avoids returning truncated results when a
// larger maxFiles value is requested after caching a smaller one.
const DIFF_CACHE = new WeakMap<
  TaskAssistantTurn,
  Map<number | undefined, Array<CodexDiffFile>>
>();

const DIFF_STRING_CACHE_LIMIT = 50;
const DIFF_STRING_CACHE_MAX_CHARS = 200000;
const DIFF_STRING_CACHE = new Map<string, Map<string, Array<CodexDiffFile>>>();

export type CodexDiffFile = {
  metadata: FileDiffMetadata;
  oldPath: string;
  newPath: string;
  additions: number;
  deletions: number;
  changedBytes: number;
  maxChangedLineBytes: number;
  firstAdditionLine?: number;
  firstDeletionLine?: number;
  isBinary: boolean;
};

export function parseDiff(
  diff: string,
  { maxFiles }: { maxFiles?: number } = {},
): Array<CodexDiffFile> {
  const shouldCache = diff.length <= DIFF_STRING_CACHE_MAX_CHARS;
  const optionKey = shouldCache ? `${maxFiles ?? "all"}` : "";
  const cacheEntry = shouldCache ? DIFF_STRING_CACHE.get(diff) : undefined;
  const cached = cacheEntry?.get(optionKey);
  if (cacheEntry) {
    DIFF_STRING_CACHE.delete(diff);
    DIFF_STRING_CACHE.set(diff, cacheEntry);
  }
  if (cached) {
    return cached;
  }
  const binaryFileIndexes = diff.includes("GIT binary patch")
    ? getBinaryFileIndexes(diff)
    : new Set<number>();
  const parsedPatches = parsePatchFiles(diff);
  const result: Array<CodexDiffFile> = [];
  let fileIndex = 0;

  for (const patch of parsedPatches) {
    for (const metadata of patch.files) {
      if (maxFiles !== undefined && result.length >= maxFiles) {
        return result;
      }

      try {
        const { oldPath, newPath } = getPaths(metadata);
        const getByteStats = createLazyChangedLineByteStats(metadata);

        const hunks = metadata.hunks;
        const additions = sumBy(hunks, (hunk) => hunk.additionLines);
        const deletions = sumBy(hunks, (hunk) => hunk.deletionLines);
        const firstAdditionLine = hunks.find(
          (hunk) => hunk.additionCount > 0,
        )?.additionStart;
        const firstDeletionLine = hunks.find(
          (hunk) => hunk.deletionLines > 0,
        )?.deletionStart;

        result.push({
          metadata,
          oldPath,
          newPath,
          additions,
          deletions,
          get changedBytes(): number {
            return getByteStats().changedBytes;
          },
          get maxChangedLineBytes(): number {
            return getByteStats().maxChangedLineBytes;
          },
          firstAdditionLine,
          firstDeletionLine,
          isBinary: binaryFileIndexes.has(fileIndex),
        });
      } catch (error) {
        logger.error(`Failed to parse diff`, {
          safe: {},
          sensitive: {
            name: metadata.name,
            error: error,
          },
        });
      }
      fileIndex += 1;
    }
  }

  if (shouldCache) {
    const nextEntry = cacheEntry ?? new Map<string, Array<CodexDiffFile>>();
    nextEntry.set(optionKey, result);
    DIFF_STRING_CACHE.delete(diff);
    DIFF_STRING_CACHE.set(diff, nextEntry);
    if (DIFF_STRING_CACHE.size > DIFF_STRING_CACHE_LIMIT) {
      const oldestKey = DIFF_STRING_CACHE.keys().next().value;
      if (oldestKey) {
        DIFF_STRING_CACHE.delete(oldestKey);
      }
    }
  }
  return result;
}

const getBinaryFileIndexes = (diff: string): Set<number> => {
  const indexes = new Set<number>();
  let currentIndex = -1;

  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith("diff --git ")) {
      currentIndex += 1;
      continue;
    }

    if (line.startsWith("GIT binary patch") && currentIndex >= 0) {
      indexes.add(currentIndex);
    }
  }

  return indexes;
};

export const parseDiffFromTurn = ({
  assistantTurn,
  maxFiles,
}: {
  assistantTurn: TaskAssistantTurn;
  maxFiles?: number;
}): Array<CodexDiffFile> => {
  const turnId = assistantTurn.id;
  if (!turnId) {
    return [];
  }

  const cachedByMax = DIFF_CACHE.get(assistantTurn);
  const cached = cachedByMax?.get(maxFiles);
  if (cached) {
    return cached;
  }

  const diffFiles: Array<CodexDiffFile> = [];
  for (const diff of getOutputDiffTexts(assistantTurn)) {
    const remaining =
      maxFiles === undefined ? undefined : maxFiles - diffFiles.length;
    if (remaining !== undefined && remaining <= 0) {
      break;
    }

    diffFiles.push(...parseDiff(diff, { maxFiles: remaining }));
  }

  diffFiles.sort((first, second) =>
    first.metadata.name.localeCompare(second.metadata.name),
  );

  const newMap =
    cachedByMax ?? new Map<number | undefined, Array<CodexDiffFile>>();
  newMap.set(maxFiles, diffFiles);
  if (!cachedByMax) {
    DIFF_CACHE.set(assistantTurn, newMap);
  }

  return diffFiles;
};

function getPaths(metadata: FileDiffMetadata): {
  oldPath: string;
  newPath: string;
  headerOldPath: string;
  headerNewPath: string;
} {
  const headerOldPath = metadata.prevName ?? metadata.name;
  const headerNewPath = metadata.name;
  const oldPath =
    metadata.type === "new" ? NULL_FILE : (metadata.prevName ?? metadata.name);
  const newPath = metadata.type === "deleted" ? NULL_FILE : metadata.name;

  return { oldPath, newPath, headerOldPath, headerNewPath };
}

function createLazyChangedLineByteStats(
  metadata: FileDiffMetadata,
): () => { changedBytes: number; maxChangedLineBytes: number } {
  let stats: { changedBytes: number; maxChangedLineBytes: number } | null =
    null;
  return (): { changedBytes: number; maxChangedLineBytes: number } => {
    if (stats == null) {
      stats = getChangedLineByteStats(metadata);
    }
    return stats;
  };
}
