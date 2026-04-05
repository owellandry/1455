import { derived, family } from "maitai";

import { shouldUseSingleFileReviewMode } from "@/diff/diff-render-budgets";
import type { CodexDiffFile } from "@/diff/parse-diff";
import { ThreadRouteScope } from "@/scopes/thread-route-scope";
import { normalizePath } from "@/utils/path";

import { selectedReviewDiff$ } from "./review-diff-state-model";

export type ReviewFileEntry = {
  diff: CodexDiffFile;
  path: string;
};

export function getReviewFilesModel({
  diff,
  diffBytes,
}: {
  diff: Array<CodexDiffFile> | null;
  diffBytes: number | null;
}): {
  fileEntries: Array<ReviewFileEntry>;
  hasReviewFiles: boolean;
  isCappedMode: boolean;
  totalChangedBytes: number;
  totalChangedLines: number;
} {
  const fileEntries = getReviewFileEntries(diff);
  const totalChangedLines = getReviewTotalChangedLines(fileEntries);
  const totalChangedBytes = getReviewTotalChangedBytes({
    diffBytes,
    fileEntries,
  });

  return {
    fileEntries,
    hasReviewFiles: fileEntries.length > 0,
    isCappedMode: shouldUseSingleFileReviewMode({
      fileCount: fileEntries.length,
      totalChangedBytes,
      totalChangedLines,
    }),
    totalChangedBytes,
    totalChangedLines,
  };
}

export const reviewFileEntries$ = derived(ThreadRouteScope, ({ get }) => {
  return getReviewFileEntries(get(selectedReviewDiff$).diff);
});

export const reviewFileEntryByPath$ = family(
  ThreadRouteScope,
  (path: string) => {
    return derived(ThreadRouteScope, ({ get }) => {
      return get(reviewFileEntries$).find((entry) => entry.path === path);
    });
  },
);

export const reviewHasFiles$ = derived(ThreadRouteScope, ({ get }) => {
  return get(reviewFileEntries$).length > 0;
});

export const reviewTotalChangedLines$ = derived(ThreadRouteScope, ({ get }) => {
  return getReviewTotalChangedLines(get(reviewFileEntries$));
});

export const reviewTotalChangedBytes$ = derived(ThreadRouteScope, ({ get }) => {
  return getReviewTotalChangedBytes({
    diffBytes: get(selectedReviewDiff$).diffBytes,
    fileEntries: get(reviewFileEntries$),
  });
});

export const reviewIsCappedMode$ = derived(ThreadRouteScope, ({ get }) => {
  return shouldUseSingleFileReviewMode({
    fileCount: get(reviewFileEntries$).length,
    totalChangedBytes: get(reviewTotalChangedBytes$),
    totalChangedLines: get(reviewTotalChangedLines$),
  });
});

function getReviewFileEntries(
  diff: Array<CodexDiffFile> | null,
): Array<ReviewFileEntry> {
  return (
    diff?.map((file) => ({
      diff: file,
      path: normalizePath(file.metadata.name),
    })) ?? []
  );
}

function getReviewTotalChangedLines(
  fileEntries: Array<ReviewFileEntry>,
): number {
  return fileEntries.reduce((sum, entry) => {
    return sum + entry.diff.additions + entry.diff.deletions;
  }, 0);
}

function getReviewTotalChangedBytes({
  diffBytes,
  fileEntries,
}: {
  diffBytes: number | null;
  fileEntries: Array<ReviewFileEntry>;
}): number {
  return (
    diffBytes ??
    fileEntries.reduce((sum, entry) => {
      return sum + entry.diff.changedBytes;
    }, 0)
  );
}
