import sumBy from "lodash/sumBy";
import { derived, signal, type Scope } from "maitai";
import type { GitReviewSummary } from "protocol";

import type { CodexDiffFile } from "@/diff/parse-diff";
import { ThreadRouteScope } from "@/scopes/thread-route-scope";

import { isStageDiffFilter, reviewDiffFilter$ } from "./diff-filter";
import type {
  ReviewDiffSnapshot,
  ReviewStageDiffSnapshot,
} from "./review-diff-model";
import {
  applyOptimisticDiffs,
  emptyOptimisticMaps,
  fetchRefreshPathsFastDiffs,
  getOptimisticPaths,
  parseRefreshPathsFastDiffs,
  type OptimisticMaps,
} from "./review-refresh-paths-fast";
import {
  branchChangesQuery$,
  branchSnapshot$,
  gitMetadataQuery$,
  lastTurnSnapshot$,
  repositorySource$,
  shouldFetchBranchChanges$,
  shouldFetchReviewSummary$,
  shouldFetchStagedAndUnstagedChanges$,
  reviewSummaryQuery$,
  stagedSnapshot$,
  stagedAndUnstagedChangesQuery$,
  unstagedSnapshot$,
  untrackedChangesQuery$,
} from "./review-repository-model";

export type ReviewSnapshotMetrics = {
  additions: number;
  bytesEstimate: number;
  deletions: number;
  fileCount: number;
  lineCount: number;
};

export const reviewOptimisticDiffs$ = signal<
  typeof ThreadRouteScope,
  OptimisticMaps
>(ThreadRouteScope, emptyOptimisticMaps());

export const reviewOptimisticPaths$ = derived(ThreadRouteScope, ({ get }) => {
  return getOptimisticPaths(get(reviewOptimisticDiffs$));
});

export function resetReviewOptimisticDiffs(
  scope: Scope<typeof ThreadRouteScope>,
): void {
  scope.set(reviewOptimisticDiffs$, emptyOptimisticMaps());
}

export function doBaseSnapshotsMatchOptimisticDiffs({
  optimisticDiffs,
  stagedSnapshot,
  unstagedSnapshot,
}: {
  optimisticDiffs: OptimisticMaps;
  stagedSnapshot: ReviewStageDiffSnapshot;
  unstagedSnapshot: ReviewStageDiffSnapshot;
}): boolean {
  const optimisticPaths = getOptimisticPaths(optimisticDiffs);
  if (optimisticPaths.size === 0) {
    return true;
  }

  const stagedPaths = new Set(
    stagedSnapshot.diff?.map((file) => file.metadata.name) ?? [],
  );
  const unstagedPaths = new Set(
    unstagedSnapshot.diff?.map((file) => file.metadata.name) ?? [],
  );
  for (const path of optimisticPaths) {
    if (stagedPaths.has(path) !== optimisticDiffs.staged.trimmed.has(path)) {
      return false;
    }
    if (
      unstagedPaths.has(path) !== optimisticDiffs.unstaged.trimmed.has(path)
    ) {
      return false;
    }
  }

  return true;
}

export async function refreshReviewPathsFast(
  scope: Scope<typeof ThreadRouteScope>,
  pathsToRefresh: Array<string>,
): Promise<void> {
  if (scope.get(repositorySource$) === "cloud" || scope.value.cwd == null) {
    return;
  }

  const paths = Array.from(new Set(pathsToRefresh.filter(Boolean)));
  if (paths.length === 0) {
    return;
  }

  const version = scope.get(reviewOptimisticDiffs$).version + 1;
  scope.set(reviewOptimisticDiffs$, (previous) => ({
    ...previous,
    version,
  }));

  const nextDiffs = await fetchRefreshPathsFastDiffs({
    cwd: scope.value.cwd,
    hasGitRpc: true,
    hostConfig: scope.value.hostConfig,
    paths,
    version,
  });

  if (scope.get(reviewOptimisticDiffs$).version > version) {
    return;
  }

  const { trimmedStaged, trimmedUnstaged, fullStaged, fullUnstaged } =
    parseRefreshPathsFastDiffs(nextDiffs);

  scope.set(reviewOptimisticDiffs$, (previous) => ({
    ...applyOptimisticDiffs(previous, {
      paths: nextDiffs.paths,
      trimmedStaged,
      trimmedUnstaged,
      fullStaged,
      fullUnstaged,
    }),
    version,
  }));
}

export function getReviewSnapshotMetrics({
  reviewSummary,
  selectedDiff,
  shouldFetchReviewSummary,
}: {
  reviewSummary: GitReviewSummary | undefined;
  selectedDiff: {
    diff: Array<CodexDiffFile> | null;
    diffText: string | null;
  };
  shouldFetchReviewSummary: boolean;
}): ReviewSnapshotMetrics {
  if (shouldFetchReviewSummary && reviewSummary?.type === "success") {
    const additions = sumBy(reviewSummary.files, (file) => file.additions ?? 0);
    const deletions = sumBy(reviewSummary.files, (file) => file.deletions ?? 0);

    return {
      additions,
      bytesEstimate: 0,
      deletions,
      fileCount: reviewSummary.files.length,
      lineCount: additions + deletions,
    };
  }

  const diff = selectedDiff.diff ?? [];
  const additions = sumBy(diff, (file) => file.additions);
  const deletions = sumBy(diff, (file) => file.deletions);

  return {
    additions,
    bytesEstimate: selectedDiff.diffText?.length ?? 0,
    deletions,
    fileCount: diff.length,
    lineCount: additions + deletions,
  };
}

const selectedReviewSnapshot$ = derived(ThreadRouteScope, ({ get }) => {
  const diffFilter = get(reviewDiffFilter$);

  if (get(repositorySource$) === "cloud" || diffFilter === "last-turn") {
    return get(lastTurnSnapshot$);
  }
  if (diffFilter === "branch") {
    return get(branchSnapshot$);
  }
  if (diffFilter === "staged") {
    return get(stagedSnapshot$);
  }

  return get(unstagedSnapshot$);
});

const selectedReviewGitChangeStatus$ = derived(ThreadRouteScope, ({ get }) => {
  const diffFilter = get(reviewDiffFilter$);

  if (get(repositorySource$) === "cloud" || diffFilter === "last-turn") {
    return {
      isFetchingGitChanges: false,
      isPendingGitChanges: false,
    };
  }

  if (diffFilter === "branch") {
    const branchChangesQuery = get(branchChangesQuery$);
    return {
      isFetchingGitChanges: branchChangesQuery.isFetching,
      isPendingGitChanges:
        get(shouldFetchBranchChanges$) && branchChangesQuery.isPending,
    };
  }

  const stagedAndUnstagedChangesQuery = get(stagedAndUnstagedChangesQuery$);
  const untrackedChangesQuery = get(untrackedChangesQuery$);

  return {
    isFetchingGitChanges:
      stagedAndUnstagedChangesQuery.isFetching ||
      untrackedChangesQuery.isFetching,
    isPendingGitChanges:
      get(shouldFetchStagedAndUnstagedChanges$) &&
      (stagedAndUnstagedChangesQuery.isPending ||
        untrackedChangesQuery.isPending),
  };
});

export const selectedReviewDiff$ = derived(ThreadRouteScope, ({ get }) => {
  const diffFilter = get(reviewDiffFilter$);
  const selectedReviewGitChangeStatus = get(selectedReviewGitChangeStatus$);
  const optimisticDiffs = get(reviewOptimisticDiffs$);
  const optimisticPaths = get(reviewOptimisticPaths$);
  const reviewSource = get(repositorySource$);
  const hasOptimisticDiffs = optimisticPaths.size > 0;
  if (reviewSource !== "cloud" && isStageDiffFilter(diffFilter)) {
    const selectedStageDiff = overlayOptimisticDiffsOnStageSnapshot(
      diffFilter === "staged" ? get(stagedSnapshot$) : get(unstagedSnapshot$),
      optimisticPaths,
      diffFilter === "staged"
        ? optimisticDiffs.staged.trimmed
        : optimisticDiffs.unstaged.trimmed,
      diffFilter === "staged"
        ? optimisticDiffs.staged.full
        : optimisticDiffs.unstaged.full,
    );

    return {
      ...selectedStageDiff,
      fullDiff: selectedStageDiff.fullDiff,
      hasOptimisticDiffs,
      isFetchingGitChanges: selectedReviewGitChangeStatus.isFetchingGitChanges,
      isPendingGitChanges: selectedReviewGitChangeStatus.isPendingGitChanges,
    };
  }

  const selectedDiff = get(selectedReviewSnapshot$);
  return {
    ...selectedDiff,
    fullDiff: null,
    hasOptimisticDiffs: false,
    isFetchingGitChanges: selectedReviewGitChangeStatus.isFetchingGitChanges,
    isPendingGitChanges: selectedReviewGitChangeStatus.isPendingGitChanges,
  };
});

export const reviewSnapshotMetrics$ = derived(ThreadRouteScope, ({ get }) => {
  const shouldFetchReviewSummary = get(shouldFetchReviewSummary$);

  return getReviewSnapshotMetrics({
    reviewSummary: get(reviewSummaryQuery$).data,
    selectedDiff: shouldFetchReviewSummary
      ? {
          diff: null,
          diffText: null,
        }
      : get(selectedReviewDiff$),
    shouldFetchReviewSummary,
  });
});

export const reviewStageFileCounts$ = derived(ThreadRouteScope, ({ get }) => {
  if (
    get(repositorySource$) === "cloud" ||
    !isStageDiffFilter(get(reviewDiffFilter$))
  ) {
    return {
      stagedFileCount: undefined,
      unstagedFileCount: undefined,
    };
  }

  const optimisticDiffs = get(reviewOptimisticDiffs$);
  const optimisticPaths = get(reviewOptimisticPaths$);
  const staged = overlayOptimisticDiffsOnStageSnapshot(
    get(stagedSnapshot$),
    optimisticPaths,
    optimisticDiffs.staged.trimmed,
    optimisticDiffs.staged.full,
  );
  const unstaged = overlayOptimisticDiffsOnStageSnapshot(
    get(unstagedSnapshot$),
    optimisticPaths,
    optimisticDiffs.unstaged.trimmed,
    optimisticDiffs.unstaged.full,
  );

  return {
    stagedFileCount: staged.diff?.length ?? 0,
    unstagedFileCount: unstaged.diff?.length ?? 0,
  };
});

export const reviewHasSelectedDiff$ = derived(ThreadRouteScope, ({ get }) => {
  return (get(selectedReviewDiff$).diff?.length ?? 0) > 0;
});

export const reviewShowGitRepoEmptyState$ = derived(
  ThreadRouteScope,
  ({ get }) => {
    const gitMetadataQuery = get(gitMetadataQuery$);

    return (
      get(repositorySource$) !== "cloud" &&
      !gitMetadataQuery.isLoading &&
      gitMetadataQuery.data?.root == null
    );
  },
);

export const reviewShowStageFilters$ = derived(
  ThreadRouteScope,
  ({ get, scope }) => {
    const diffFilter = get(reviewDiffFilter$);
    const gitMetadataQuery = get(gitMetadataQuery$);

    return (
      scope.threadType === "local" &&
      isStageDiffFilter(diffFilter) &&
      gitMetadataQuery.data?.root != null &&
      (get(repositorySource$) === "local" ||
        get(repositorySource$) === "worktree")
    );
  },
);

export const reviewCanCopyGitApplyCommand$ = derived(
  ThreadRouteScope,
  ({ get }) => {
    const selectedDiff = get(selectedReviewDiff$);

    return (
      selectedDiff.diffText != null &&
      selectedDiff.diffText.trim().length > 0 &&
      !(get(reviewShowStageFilters$) && selectedDiff.hasOptimisticDiffs)
    );
  },
);

export const reviewCanRefreshGitQueries$ = derived(
  ThreadRouteScope,
  ({ get }) => {
    return get(gitMetadataQuery$).data?.commonDir != null;
  },
);

export const reviewShowLoading$ = derived(
  ThreadRouteScope,
  ({ get, scope }) => {
    const selectedDiff = get(selectedReviewDiff$);

    return (
      scope.threadType === "local" &&
      selectedDiff.isPendingGitChanges &&
      !get(reviewHasSelectedDiff$)
    );
  },
);

export const reviewShowDiffTooLarge$ = derived(ThreadRouteScope, ({ get }) => {
  return get(selectedReviewDiff$).diffError?.type === "diff-too-large";
});

export function shouldResetReviewOptimisticDiffs({
  shouldFetchStagedAndUnstagedChanges,
  stagedAndUnstagedChangesFetching,
  stagedAndUnstagedChangesUpdatedAt,
  untrackedChangesFetching,
  untrackedChangesUpdatedAt,
}: {
  shouldFetchStagedAndUnstagedChanges: boolean;
  stagedAndUnstagedChangesFetching: boolean;
  stagedAndUnstagedChangesUpdatedAt: number;
  untrackedChangesFetching: boolean;
  untrackedChangesUpdatedAt: number;
}): boolean {
  if (!shouldFetchStagedAndUnstagedChanges) {
    return false;
  }

  if (stagedAndUnstagedChangesFetching || untrackedChangesFetching) {
    return false;
  }

  return (
    stagedAndUnstagedChangesUpdatedAt !== 0 || untrackedChangesUpdatedAt !== 0
  );
}

export const reviewShouldResetOptimisticDiffs$ = derived(
  ThreadRouteScope,
  ({ get }) => {
    const shouldFetchStagedAndUnstagedChanges = get(
      shouldFetchStagedAndUnstagedChanges$,
    );
    const optimisticDiffs = get(reviewOptimisticDiffs$);
    const optimisticPaths = getOptimisticPaths(optimisticDiffs);

    if (!shouldFetchStagedAndUnstagedChanges) {
      return false;
    }
    if (optimisticPaths.size === 0 && optimisticDiffs.version === 0) {
      return false;
    }
    if (
      !doBaseSnapshotsMatchOptimisticDiffs({
        optimisticDiffs,
        stagedSnapshot: get(stagedSnapshot$),
        unstagedSnapshot: get(unstagedSnapshot$),
      })
    ) {
      return false;
    }

    const stagedAndUnstagedChangesQuery = get(stagedAndUnstagedChangesQuery$);
    const untrackedChangesQuery = get(untrackedChangesQuery$);

    return shouldResetReviewOptimisticDiffs({
      shouldFetchStagedAndUnstagedChanges,
      stagedAndUnstagedChangesFetching:
        stagedAndUnstagedChangesQuery.isFetching,
      stagedAndUnstagedChangesUpdatedAt:
        stagedAndUnstagedChangesQuery.dataUpdatedAt,
      untrackedChangesFetching: untrackedChangesQuery.isFetching,
      untrackedChangesUpdatedAt: untrackedChangesQuery.dataUpdatedAt,
    });
  },
);

function overlayOptimisticDiffsOnStageSnapshot(
  snapshot: ReviewStageDiffSnapshot,
  optimisticPaths: Set<string>,
  trimmedOverrides: Map<string, CodexDiffFile>,
  fullOverrides: Map<string, CodexDiffFile>,
): ReviewStageDiffSnapshot {
  return {
    ...snapshot,
    diff: overlayOptimisticDiffsOnSnapshot(
      snapshot,
      optimisticPaths,
      trimmedOverrides,
    ).diff,
    fullDiff: overlayOptimisticDiffsOnSnapshot(
      {
        ...snapshot,
        diff: snapshot.fullDiff,
      },
      optimisticPaths,
      fullOverrides,
    ).diff,
  };
}

function overlayOptimisticDiffsOnSnapshot(
  snapshot: ReviewDiffSnapshot,
  optimisticPaths: Set<string>,
  overrides: Map<string, CodexDiffFile>,
): ReviewDiffSnapshot {
  if (snapshot.diff == null && overrides.size === 0) {
    return snapshot;
  }

  const overriddenPaths = new Set(overrides.keys());
  const diff = [...(snapshot.diff ?? [])]
    .filter((file) => {
      return (
        !optimisticPaths.has(file.metadata.name) &&
        !overriddenPaths.has(file.metadata.name)
      );
    })
    .concat(Array.from(overrides.values()))
    .sort((first, second) =>
      first.metadata.name.localeCompare(second.metadata.name),
    );

  return {
    ...snapshot,
    diff,
  };
}
