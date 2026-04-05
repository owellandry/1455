import {
  derived,
  querySignal,
  signal,
  type DestructorFn,
  type Scope,
} from "maitai";
import type {
  GitBranchChangesResult,
  GitDiff,
  GitDiffError,
  GitReviewSource,
  GitReviewSummary,
  GitStagedAndUnstagedChangesResult,
  GitUntrackedChangesResult,
} from "protocol";
import { createGitCwd } from "protocol";

import { mergeUnifiedDiffs } from "@/diff/merge-unified-diffs";
import { parseDiff, type CodexDiffFile } from "@/diff/parse-diff";
import { gitQueryOptions } from "@/git-rpc/git-api";
import type { GitBaseBranch } from "@/git-rpc/use-git-base-branch";
import {
  projectContext$,
  projectGitMetadataQuery$,
} from "@/project-context/project-context-signal";
import { ThreadRouteScope } from "@/scopes/thread-route-scope";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";

import { isStageDiffFilter, reviewDiffFilter$ } from "./diff-filter";
import { reviewLayoutMode$ } from "./review-preferences-model";

export type ReviewSnapshot = {
  diff: Array<CodexDiffFile> | null;
  diffText: string | null;
  diffBytes: number | null;
  diffError: GitDiffError | null;
};

export type ReviewStageSnapshot = ReviewSnapshot & {
  fullDiff: Array<CodexDiffFile> | null;
};

export type RepositorySource = "cloud" | "local" | "worktree";

const UTF8_ENCODER = new TextEncoder();
const reviewLastTurnDiff$ = signal<typeof ThreadRouteScope, string | null>(
  ThreadRouteScope,
  null,
);
const reviewObservedGitIndexLastModified$ = signal<
  typeof ThreadRouteScope,
  number | null
>(ThreadRouteScope, null);

export const gitMetadataQuery$ = projectGitMetadataQuery$;

export const baseBranchQuery$ = querySignal<
  typeof ThreadRouteScope,
  GitBaseBranch
>(ThreadRouteScope, ({ get, scope }) => {
  const metadata = get(gitMetadataQuery$).data ?? null;

  return gitQueryOptions(
    "base-branch",
    metadata,
    metadata == null ? null : { root: metadata.root },
    true,
    scope.hostKey,
    scope.hostConfig,
  );
});

export const currentBranchQuery$ = querySignal<
  typeof ThreadRouteScope,
  { branch: string | null },
  Error,
  string | null
>(ThreadRouteScope, ({ get, scope }) => {
  const metadata = get(gitMetadataQuery$).data ?? null;

  return gitQueryOptions<"current-branch", string | null>(
    "current-branch",
    metadata,
    metadata == null ? null : { root: metadata.root },
    true,
    scope.hostKey,
    scope.hostConfig,
    {
      select: (data) => data.branch,
    },
  );
});

export const branchChangesQuery$ = querySignal<
  typeof ThreadRouteScope,
  GitBranchChangesResult
>(ThreadRouteScope, ({ get, scope }) => {
  return gitQueryOptions(
    "branch-changes",
    get(gitMetadataQuery$).data,
    scope.cwd == null ? null : { cwd: createGitCwd(scope.cwd) },
    true,
    scope.hostKey,
    scope.hostConfig,
    {
      enabled: get(shouldFetchBranchChanges$),
      refetchOnWindowFocus: "always",
      staleTime: QUERY_STALE_TIME.FIVE_SECONDS,
    },
  );
});

export const stagedAndUnstagedChangesQuery$ = querySignal<
  typeof ThreadRouteScope,
  GitStagedAndUnstagedChangesResult
>(ThreadRouteScope, ({ get, scope }) => {
  return gitQueryOptions(
    "staged-and-unstaged-changes",
    get(gitMetadataQuery$).data,
    scope.cwd == null ? null : { cwd: createGitCwd(scope.cwd) },
    true,
    scope.hostKey,
    scope.hostConfig,
    {
      enabled: get(shouldFetchStagedAndUnstagedChanges$),
      refetchOnWindowFocus: "always",
      staleTime: QUERY_STALE_TIME.FIVE_SECONDS,
    },
  );
});

export const untrackedChangesQuery$ = querySignal<
  typeof ThreadRouteScope,
  GitUntrackedChangesResult
>(ThreadRouteScope, ({ get, scope }) => {
  return gitQueryOptions(
    "untracked-changes",
    get(gitMetadataQuery$).data,
    scope.cwd == null ? null : { cwd: createGitCwd(scope.cwd) },
    true,
    scope.hostKey,
    scope.hostConfig,
    {
      enabled: get(shouldFetchStagedAndUnstagedChanges$),
      refetchOnWindowFocus: "always",
      staleTime: QUERY_STALE_TIME.FIVE_SECONDS,
    },
  );
});

export const gitIndexInfoQuery$ = querySignal<
  typeof ThreadRouteScope,
  { lastModified: number }
>(ThreadRouteScope, ({ get, scope }) => {
  return gitQueryOptions(
    "index-info",
    get(gitMetadataQuery$).data,
    scope.cwd == null ? null : { cwd: createGitCwd(scope.cwd) },
    true,
    scope.hostKey,
    scope.hostConfig,
    {
      enabled: get(shouldFetchStagedAndUnstagedChanges$),
      refetchOnWindowFocus: "always",
      staleTime: QUERY_STALE_TIME.FIVE_SECONDS,
    },
  );
});

export const repositorySource$ = derived(ThreadRouteScope, ({ get, scope }) => {
  if (scope.threadType === "remote") {
    return "cloud" satisfies RepositorySource;
  }

  return get(projectContext$).isCodexWorktree
    ? ("worktree" satisfies RepositorySource)
    : ("local" satisfies RepositorySource);
});

export const shouldFetchBranchChanges$ = derived(
  ThreadRouteScope,
  ({ get, scope }) => {
    return (
      scope.cwd != null &&
      get(reviewLayoutMode$) !== "collapsed" &&
      get(repositorySource$) !== "cloud" &&
      get(reviewDiffFilter$) === "branch"
    );
  },
);

export const shouldFetchStagedAndUnstagedChanges$ = derived(
  ThreadRouteScope,
  ({ get, scope }) => {
    return (
      scope.cwd != null &&
      get(reviewLayoutMode$) !== "collapsed" &&
      get(repositorySource$) !== "cloud" &&
      isStageDiffFilter(get(reviewDiffFilter$))
    );
  },
);

export const shouldFetchReviewSummary$ = derived(
  ThreadRouteScope,
  ({ get }) => {
    return (
      get(repositorySource$) !== "cloud" &&
      get(reviewDiffFilter$) !== "last-turn"
    );
  },
);

export const reviewSummarySource$ = derived(
  ThreadRouteScope,
  ({ get }): GitReviewSource | null => {
    const diffFilter = get(reviewDiffFilter$);

    if (diffFilter === "last-turn") {
      return null;
    }

    return diffFilter;
  },
);

export const reviewSummaryQuery$ = querySignal<
  typeof ThreadRouteScope,
  GitReviewSummary
>(ThreadRouteScope, ({ get, scope }) => {
  const source = get(reviewSummarySource$);

  return gitQueryOptions(
    "review-summary",
    get(gitMetadataQuery$).data,
    scope.cwd == null || source == null
      ? null
      : { cwd: createGitCwd(scope.cwd), source },
    true,
    scope.hostKey,
    scope.hostConfig,
    {
      enabled: get(shouldFetchReviewSummary$),
      refetchOnWindowFocus: "always",
      staleTime: QUERY_STALE_TIME.FIVE_SECONDS,
    },
  );
});

export const lastTurnSnapshot$ = derived(ThreadRouteScope, ({ get }) => {
  return getReviewSnapshotFromUnifiedDiff(get(reviewLastTurnDiff$));
});

export const branchSnapshot$ = derived(ThreadRouteScope, ({ get }) => {
  return getReviewSnapshotFromGitDiff(
    get(branchChangesQuery$).data?.branchChanges,
  );
});

export const stagedSnapshot$ = derived(ThreadRouteScope, ({ get }) => {
  return getReviewStageSnapshotFromGitDiff(
    get(stagedAndUnstagedChangesQuery$).data?.stagedChanges,
  );
});

export const unstagedSnapshot$ = derived(ThreadRouteScope, ({ get }) => {
  return getReviewUnstagedSnapshot({
    tracked: get(stagedAndUnstagedChangesQuery$).data?.unstagedChanges,
    untracked: get(untrackedChangesQuery$).data?.untrackedChanges,
  });
});

export async function refetchReviewGitChanges(
  scope: Scope<typeof ThreadRouteScope>,
): Promise<void> {
  const refetches: Array<Promise<unknown>> = [];

  if (scope.get(shouldFetchBranchChanges$)) {
    refetches.push(scope.get(branchChangesQuery$).refetch());
  }
  if (scope.get(shouldFetchStagedAndUnstagedChanges$)) {
    refetches.push(scope.get(stagedAndUnstagedChangesQuery$).refetch());
    refetches.push(scope.get(untrackedChangesQuery$).refetch());
  }

  await Promise.all(refetches);
}

export async function refetchReviewGitIndexInfo(
  scope: Scope<typeof ThreadRouteScope>,
): Promise<void> {
  if (!scope.get(shouldFetchStagedAndUnstagedChanges$)) {
    return;
  }

  await scope.get(gitIndexInfoQuery$).refetch();
}

export function setReviewLastTurnDiff(
  scope: Scope<typeof ThreadRouteScope>,
  diff: string | null,
): void {
  scope.set(reviewLastTurnDiff$, diff);
}

export function startReviewGitChangesRefetch(
  scope: Scope<typeof ThreadRouteScope>,
): DestructorFn {
  return scope.watch((watchScope) => {
    const shouldFetchBranchChanges = watchScope.get(shouldFetchBranchChanges$);
    const shouldFetchStagedAndUnstagedChanges = watchScope.get(
      shouldFetchStagedAndUnstagedChanges$,
    );
    const shouldRefetch =
      watchScope.get(reviewLastTurnDiff$) != null ||
      shouldFetchBranchChanges ||
      shouldFetchStagedAndUnstagedChanges;

    if (!shouldRefetch) {
      return undefined;
    }

    void refetchReviewGitChanges(scope);
    return undefined;
  });
}

export function startReviewGitIndexRefresh(
  scope: Scope<typeof ThreadRouteScope>,
): DestructorFn {
  return scope.watch((watchScope) => {
    const shouldFetch = watchScope.get(shouldFetchStagedAndUnstagedChanges$);
    const gitIndexLastModified =
      watchScope.get(gitIndexInfoQuery$).data?.lastModified ?? null;
    const previousGitIndexLastModified = watchScope.get(
      reviewObservedGitIndexLastModified$,
    );

    if (!shouldFetch) {
      if (previousGitIndexLastModified != null) {
        watchScope.set(reviewObservedGitIndexLastModified$, null);
      }
      return undefined;
    }

    if (gitIndexLastModified == null) {
      return undefined;
    }

    if (gitIndexLastModified !== previousGitIndexLastModified) {
      watchScope.set(reviewObservedGitIndexLastModified$, gitIndexLastModified);
    }

    if (
      previousGitIndexLastModified != null &&
      gitIndexLastModified !== previousGitIndexLastModified
    ) {
      void refetchReviewGitChanges(scope);
    }

    return undefined;
  });
}

function getReviewSnapshotFromUnifiedDiff(
  unifiedDiff: string | null | undefined,
): ReviewSnapshot {
  if (unifiedDiff == null || unifiedDiff.trim() === "") {
    return {
      diff: null,
      diffText: null,
      diffBytes: null,
      diffError: null,
    };
  }

  const diffText = unifiedDiff.trim();

  return {
    diff: parseDiff(diffText),
    diffText,
    diffBytes: UTF8_ENCODER.encode(diffText).length,
    diffError: null,
  };
}

function getReviewSnapshotFromGitDiff(
  gitDiff: GitDiff | null | undefined,
): ReviewSnapshot {
  if (gitDiff?.type === "error") {
    return {
      diff: null,
      diffText: null,
      diffBytes: null,
      diffError: gitDiff.error,
    };
  }

  if (gitDiff?.type !== "success") {
    return {
      diff: null,
      diffText: null,
      diffBytes: null,
      diffError: null,
    };
  }

  return {
    diff: parseDiff(gitDiff.unifiedDiff),
    diffText: gitDiff.unifiedDiff,
    diffBytes:
      gitDiff.unifiedDiffBytes ??
      UTF8_ENCODER.encode(gitDiff.unifiedDiff).length,
    diffError: null,
  };
}

function getReviewStageSnapshotFromGitDiff(
  gitDiff: GitDiff | null | undefined,
): ReviewStageSnapshot {
  const snapshot = getReviewSnapshotFromGitDiff(gitDiff);

  return {
    ...snapshot,
    fullDiff: snapshot.diff,
  };
}

function getReviewUnstagedSnapshot({
  tracked,
  untracked,
}: {
  tracked: GitDiff | null | undefined;
  untracked: GitDiff | null | undefined;
}): ReviewStageSnapshot {
  const trackedError = tracked?.type === "error" ? tracked.error : null;
  const untrackedError = untracked?.type === "error" ? untracked.error : null;

  if (trackedError != null) {
    return {
      diff: null,
      diffText: null,
      diffBytes: null,
      diffError: trackedError,
      fullDiff: null,
    };
  }

  if (untrackedError != null) {
    return {
      diff: null,
      diffText: null,
      diffBytes: null,
      diffError: untrackedError,
      fullDiff: null,
    };
  }

  const mergedUnifiedDiff = mergeUnifiedDiffs([
    tracked?.type === "success" ? tracked.unifiedDiff : null,
    untracked?.type === "success" ? untracked.unifiedDiff : null,
  ]);
  const snapshot = getReviewSnapshotFromUnifiedDiff(mergedUnifiedDiff);

  return {
    ...snapshot,
    fullDiff: snapshot.diff,
  };
}
