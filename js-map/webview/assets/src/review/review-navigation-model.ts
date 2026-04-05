import { derived, signal, type Scope } from "maitai";

import { contentSearchActiveDiffResult$ } from "@/content-search/search-model";
import { ThreadRouteScope } from "@/scopes/thread-route-scope";

import { reviewFileEntries$, reviewIsCappedMode$ } from "./review-files-model";
import { reviewDiffSearchFilter$ } from "./review-search-model";

const MAX_FIND_MATCH_FILES_WINDOW = 20;

export const reviewRequestedPath$ = signal(
  ThreadRouteScope,
  undefined as string | undefined,
);

export const reviewFileSearchQuery$ = signal(ThreadRouteScope, "");

const reviewFindWindowState$ = signal(ThreadRouteScope, {
  count: MAX_FIND_MATCH_FILES_WINDOW,
  key: "",
});

export const reviewFilteredFileEntries$ = derived(
  ThreadRouteScope,
  ({ get }) => {
    return filterReviewFileEntries(
      get(reviewFileEntries$),
      get(reviewFileSearchQuery$),
    );
  },
);

export const reviewFindFilteredFileEntries$ = derived(
  ThreadRouteScope,
  ({ get }) => {
    const filteredFileEntries = get(reviewFilteredFileEntries$);
    const diffSearchFilter = get(reviewDiffSearchFilter$);

    if (!diffSearchFilter.active) {
      return filteredFileEntries;
    }
    if (diffSearchFilter.matchingPaths.length === 0) {
      return [];
    }

    const matchingPaths = new Set(diffSearchFilter.matchingPaths);
    return filteredFileEntries.filter((entry) => {
      return matchingPaths.has(entry.path);
    });
  },
);

export const reviewFindModeActive$ = derived(ThreadRouteScope, ({ get }) => {
  return (
    get(reviewIsCappedMode$) &&
    get(reviewDiffSearchFilter$).active &&
    get(reviewFindFilteredFileEntries$).length > 0
  );
});

const reviewFindWindowCount$ = derived(ThreadRouteScope, ({ get }) => {
  if (!get(reviewFindModeActive$)) {
    return MAX_FIND_MATCH_FILES_WINDOW;
  }

  const reviewFindWindowState = get(reviewFindWindowState$);
  const reviewDiffSearchResult = get(contentSearchActiveDiffResult$);
  const fileSearchQuery = get(reviewFileSearchQuery$).trim().toLowerCase();
  const findWindowKey = `${reviewDiffSearchResult?.query ?? ""}|${fileSearchQuery}|${get(reviewDiffSearchFilter$).active}`;

  if (reviewFindWindowState.key !== findWindowKey) {
    return MAX_FIND_MATCH_FILES_WINDOW;
  }

  return reviewFindWindowState.count;
});

export const reviewFindVisibleEntries$ = derived(
  ThreadRouteScope,
  ({ get }) => {
    const reviewFindFilteredFileEntries = get(reviewFindFilteredFileEntries$);

    if (!get(reviewFindModeActive$)) {
      return reviewFindFilteredFileEntries;
    }

    let visibleWindowCount = get(reviewFindWindowCount$);
    const requestedPath = get(reviewRequestedPath$);
    if (requestedPath != null) {
      const requestedPathIndex = reviewFindFilteredFileEntries.findIndex(
        (entry) => {
          return entry.path === requestedPath;
        },
      );
      if (requestedPathIndex >= visibleWindowCount) {
        visibleWindowCount =
          Math.ceil((requestedPathIndex + 1) / MAX_FIND_MATCH_FILES_WINDOW) *
          MAX_FIND_MATCH_FILES_WINDOW;
      }
    }

    return reviewFindFilteredFileEntries.slice(0, visibleWindowCount);
  },
);

export const reviewFileTreeEntries$ = derived(ThreadRouteScope, ({ get }) => {
  return get(reviewFindFilteredFileEntries$);
});

export const reviewCappedSelectedPath$ = derived(
  ThreadRouteScope,
  ({ get }) => {
    const requestedPath = get(reviewRequestedPath$);
    const selectionEntries = get(reviewIsCappedMode$)
      ? get(reviewFileTreeEntries$)
      : get(reviewFilteredFileEntries$);

    if (!get(reviewIsCappedMode$)) {
      return requestedPath;
    }
    if (selectionEntries.length === 0) {
      return undefined;
    }
    if (
      requestedPath != null &&
      selectionEntries.some((entry) => entry.path === requestedPath)
    ) {
      return requestedPath;
    }

    return selectionEntries[0]?.path;
  },
);

export const reviewCappedSelectedEntry$ = derived(
  ThreadRouteScope,
  ({ get }) => {
    if (!get(reviewIsCappedMode$)) {
      return undefined;
    }

    const cappedSelectedPath = get(reviewCappedSelectedPath$);
    const selectionEntries = get(reviewFileTreeEntries$);
    return (
      selectionEntries.find((entry) => entry.path === cappedSelectedPath) ??
      selectionEntries[0]
    );
  },
);

export const reviewFindFilteredEntriesLength$ = derived(
  ThreadRouteScope,
  ({ get }) => {
    return get(reviewFindFilteredFileEntries$).length;
  },
);

export function requestReviewSelectedPath(
  scope: Scope<typeof ThreadRouteScope>,
  path: string | undefined,
): void {
  scope.set(reviewRequestedPath$, path);
}

export function setReviewFileSearchQuery(
  scope: Scope<typeof ThreadRouteScope>,
  query: string,
): void {
  scope.set(reviewFileSearchQuery$, query);

  if (!scope.get(reviewIsCappedMode$)) {
    return;
  }

  const nextFilteredEntries = filterReviewFileEntries(
    scope.get(reviewFileEntries$),
    query,
  );
  const diffSearchFilter = scope.get(reviewDiffSearchFilter$);
  const nextFindFilteredEntries = !diffSearchFilter.active
    ? nextFilteredEntries
    : nextFilteredEntries.filter((entry) => {
        return diffSearchFilter.matchingPaths.includes(entry.path);
      });
  if (nextFindFilteredEntries.length === 0) {
    return;
  }

  const cappedSelectedPath = scope.get(reviewCappedSelectedPath$);
  if (
    cappedSelectedPath != null &&
    nextFindFilteredEntries.some((entry) => entry.path === cappedSelectedPath)
  ) {
    return;
  }

  scope.set(reviewRequestedPath$, nextFindFilteredEntries[0]?.path);
}

export function loadMoreReviewFindMatches(
  scope: Scope<typeof ThreadRouteScope>,
): void {
  const reviewFindFilteredEntriesLength = scope.get(
    reviewFindFilteredEntriesLength$,
  );
  const reviewDiffSearchResult = scope.get(contentSearchActiveDiffResult$);
  const fileSearchQuery = scope
    .get(reviewFileSearchQuery$)
    .trim()
    .toLowerCase();
  const findWindowKey = `${reviewDiffSearchResult?.query ?? ""}|${fileSearchQuery}|${scope.get(reviewDiffSearchFilter$).active}`;
  const clampedCount = Math.min(
    reviewFindFilteredEntriesLength,
    Math.max(
      MAX_FIND_MATCH_FILES_WINDOW,
      scope.get(reviewFindVisibleEntries$).length + MAX_FIND_MATCH_FILES_WINDOW,
    ),
  );

  scope.set(reviewFindWindowState$, (previousState) => {
    if (
      previousState.key === findWindowKey &&
      previousState.count === clampedCount
    ) {
      return previousState;
    }

    return {
      count: clampedCount,
      key: findWindowKey,
    };
  });
}

export function filterReviewFileEntries<T extends { path: string }>(
  entries: Array<T>,
  query: string,
): Array<T> {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length === 0) {
    return entries;
  }

  return entries.filter((entry) => {
    return entry.path.toLowerCase().includes(normalizedQuery);
  });
}
