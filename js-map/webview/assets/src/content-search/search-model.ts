import { derived, signal, type DestructorFn, type Scope } from "maitai";

import { ThreadRouteScope } from "@/scopes/thread-route-scope";

import { getActiveMatch, getActiveResultForDomain } from "./search-helpers";
import type { SearchSource } from "./source";
import type {
  SearchDomain,
  SearchMatch,
  SearchRequest,
  SearchResult,
} from "./types";

interface ContentSearchOrchestration {
  clearDebouncedSearch: () => void;
  ensureVisibleActiveMatch: () => Promise<void>;
  runSearch: (options: { selectFirstMatch: boolean }) => Promise<void>;
}

export interface ContentSearchOrchestrationSources {
  conversationSource: SearchSource | null;
  diffSource: SearchSource | null;
}

const SEARCH_DEBOUNCE_MS = 150;

const contentSearchOrchestration$ = signal(
  ThreadRouteScope,
  null as ContentSearchOrchestration | null,
);

export const contentSearchDefaultDomainForOpen$ = signal(
  ThreadRouteScope,
  "conversation" as SearchDomain,
);
export const contentSearchIsOpen$ = signal(ThreadRouteScope, false);
export const contentSearchDomain$ = signal(
  ThreadRouteScope,
  "conversation" as SearchDomain,
);
export const contentSearchQuery$ = signal(ThreadRouteScope, "");
export const contentSearchResult$ = signal(
  ThreadRouteScope,
  null as SearchResult | null,
);
export const contentSearchIsLoading$ = signal(ThreadRouteScope, false);
export const contentSearchActiveIndex$ = signal(
  ThreadRouteScope,
  null as number | null,
);
export const contentSearchDiffSource$ = signal(
  ThreadRouteScope,
  null as SearchSource | null,
);

export const contentSearchHasQuery$ = derived(ThreadRouteScope, ({ get }) => {
  return get(contentSearchQuery$).trim().length > 0;
});

export const contentSearchActiveConversationResult$ = derived(
  ThreadRouteScope,
  ({ get }): SearchResult | null => {
    return getActiveResultForDomain(
      {
        query: get(contentSearchQuery$).trim(),
        routeContextId: get(contentSearchResult$)?.contextId ?? "unavailable",
        stateDomain: get(contentSearchDomain$),
        result: get(contentSearchResult$),
      },
      "conversation",
    );
  },
);

export const contentSearchActiveDiffResult$ = derived(
  ThreadRouteScope,
  ({ get }): SearchResult | null => {
    return getActiveResultForDomain(
      {
        query: get(contentSearchQuery$).trim(),
        routeContextId: get(contentSearchResult$)?.contextId ?? "unavailable",
        stateDomain: get(contentSearchDomain$),
        result: get(contentSearchResult$),
      },
      "diff",
    );
  },
);

export const contentSearchActiveMatch$ = derived(
  ThreadRouteScope,
  ({ get }): SearchMatch | null => {
    return getActiveMatch(
      get(contentSearchResult$),
      get(contentSearchActiveIndex$),
    );
  },
);

export function openContentSearch(scope: Scope<typeof ThreadRouteScope>): void {
  scope.set(contentSearchIsOpen$, true);
}

export function setContentSearchDefaultDomainForOpen(
  scope: Scope<typeof ThreadRouteScope>,
  domain: SearchDomain,
): void {
  scope.set(contentSearchDefaultDomainForOpen$, domain);
}

export function closeContentSearch(
  scope: Scope<typeof ThreadRouteScope>,
): void {
  scope.set(contentSearchIsOpen$, false);
  scope.set(contentSearchQuery$, "");
  scope.set(contentSearchResult$, null);
  scope.set(contentSearchIsLoading$, false);
  scope.set(contentSearchActiveIndex$, null);
}

export function setContentSearchDomain(
  scope: Scope<typeof ThreadRouteScope>,
  domain: SearchDomain,
): void {
  scope.set(contentSearchDomain$, domain);
  scope.set(contentSearchResult$, null);
  scope.set(contentSearchIsLoading$, false);
  scope.set(contentSearchActiveIndex$, null);
}

export function setContentSearchQuery(
  scope: Scope<typeof ThreadRouteScope>,
  query: string,
): void {
  if (query.trim().length === 0) {
    scope.set(contentSearchQuery$, query);
    scope.set(contentSearchResult$, null);
    scope.set(contentSearchIsLoading$, false);
    scope.set(contentSearchActiveIndex$, null);
    return;
  }

  scope.set(contentSearchQuery$, query);
  scope.set(contentSearchIsLoading$, true);
}

export function selectContentSearch(
  scope: Scope<typeof ThreadRouteScope>,
  index: number | null,
): void {
  const result = scope.get(contentSearchResult$);
  if (index == null || result == null || result.matches.length === 0) {
    scope.set(contentSearchActiveIndex$, null);
    return;
  }

  const nextIndex = normalizeContentSearchIndex(index, result.matches.length);
  if (scope.get(contentSearchActiveIndex$) === nextIndex) {
    void scope.get(contentSearchOrchestration$)?.ensureVisibleActiveMatch();
    return;
  }

  scope.set(contentSearchActiveIndex$, nextIndex);
}

export function nextContentSearch(scope: Scope<typeof ThreadRouteScope>): void {
  const result = scope.get(contentSearchResult$);
  if (result == null || result.matches.length === 0) {
    return;
  }

  selectContentSearch(scope, (scope.get(contentSearchActiveIndex$) ?? -1) + 1);
}

export function previousContentSearch(
  scope: Scope<typeof ThreadRouteScope>,
): void {
  const result = scope.get(contentSearchResult$);
  if (result == null || result.matches.length === 0) {
    return;
  }

  selectContentSearch(scope, (scope.get(contentSearchActiveIndex$) ?? 0) - 1);
}

export function submitContentSearch(
  scope: Scope<typeof ThreadRouteScope>,
  opts?: { shift?: boolean },
): void {
  const trimmedQuery = scope.get(contentSearchQuery$).trim();
  if (trimmedQuery.length === 0) {
    return;
  }

  const result = scope.get(contentSearchResult$);
  const hasCurrentResult =
    result != null &&
    result.query === trimmedQuery &&
    result.domain === scope.get(contentSearchDomain$);

  if (!hasCurrentResult) {
    void scope.get(contentSearchOrchestration$)?.runSearch({
      selectFirstMatch: true,
    });
    return;
  }

  if (opts?.shift) {
    previousContentSearch(scope);
    return;
  }

  nextContentSearch(scope);
}

export function startContentSearchOrchestration(
  scope: Scope<typeof ThreadRouteScope>,
  sources: ContentSearchOrchestrationSources = {
    conversationSource: null,
    diffSource: null,
  },
): DestructorFn {
  let nextRunId = 1;
  let searchToken = 0;
  let searchAbortController: AbortController | null = null;
  let debouncedSearchTimeoutId: number | null = null;
  let isDisposed = false;
  let lastEnsuredVisibleMatchKey: string | null = null;

  const clearDebouncedSearch = (): void => {
    if (debouncedSearchTimeoutId == null) {
      return;
    }

    window.clearTimeout(debouncedSearchTimeoutId);
    debouncedSearchTimeoutId = null;
  };

  const cancelInFlightSearch = (): void => {
    searchAbortController?.abort();
    searchAbortController = null;
    searchToken += 1;
  };

  const runSearch = async ({
    selectFirstMatch,
  }: {
    selectFirstMatch: boolean;
  }): Promise<void> => {
    if (isDisposed) {
      return;
    }

    clearDebouncedSearch();

    const trimmedQuery = scope.get(contentSearchQuery$).trim();
    if (trimmedQuery.length === 0) {
      scope.set(contentSearchIsLoading$, false);
      return;
    }

    searchAbortController?.abort();
    const abortController = new AbortController();
    searchAbortController = abortController;
    searchToken += 1;
    const token = searchToken;
    const requestDomain = scope.get(contentSearchDomain$);
    const source = getSourceForDomain({
      domain: requestDomain,
      conversationSource: sources.conversationSource,
      diffSource: sources.diffSource,
    });
    const requestContextId = source?.contextId ?? "unavailable";
    scope.set(contentSearchIsLoading$, true);

    try {
      const request: SearchRequest = {
        domain: requestDomain,
        contextId: requestContextId,
        query: trimmedQuery,
      };

      let nextResult: SearchResult;
      if (source == null) {
        nextResult = createEmptyResult(request, nextRunId);
        nextRunId += 1;
      } else {
        const runId = nextRunId;
        nextRunId += 1;
        const sourceResult = await source.search(request, {
          signal: abortController.signal,
        });
        nextResult = { ...sourceResult, runId };
      }

      if (token !== searchToken) {
        return;
      }
      if (isDisposed) {
        return;
      }

      const currentIndex = scope.get(contentSearchActiveIndex$);
      const validCurrentIndex =
        currentIndex != null &&
        currentIndex >= 0 &&
        currentIndex < nextResult.matches.length;
      const nextIndex =
        selectFirstMatch && nextResult.matches.length > 0
          ? 0
          : nextResult.matches.length > 0
            ? validCurrentIndex
              ? currentIndex
              : 0
            : null;

      scope.set(contentSearchResult$, nextResult);
      scope.set(contentSearchActiveIndex$, nextIndex);
      scope.set(contentSearchIsLoading$, false);
    } catch {
      if (abortController.signal.aborted) {
        return;
      }
      if (token !== searchToken) {
        return;
      }
      if (isDisposed) {
        return;
      }

      scope.set(contentSearchResult$, null);
      scope.set(contentSearchActiveIndex$, null);
      scope.set(contentSearchIsLoading$, false);
    }
  };

  const ensureVisibleActiveMatch = async (): Promise<void> => {
    const result = scope.get(contentSearchResult$);
    const activeIndex = scope.get(contentSearchActiveIndex$);
    if (result == null || activeIndex == null) {
      return;
    }

    await ensureVisibleForIndex(sources, result, activeIndex);
  };

  const orchestration: ContentSearchOrchestration = {
    clearDebouncedSearch,
    ensureVisibleActiveMatch,
    runSearch,
  };
  scope.set(contentSearchOrchestration$, orchestration);

  const scheduleDebouncedSearch = (): void => {
    clearDebouncedSearch();
    cancelInFlightSearch();

    const isOpen = scope.get(contentSearchIsOpen$);
    const trimmedQuery = scope.get(contentSearchQuery$).trim();
    if (!isOpen || trimmedQuery.length === 0) {
      scope.set(contentSearchIsLoading$, false);
      return;
    }

    debouncedSearchTimeoutId = window.setTimeout(() => {
      void runSearch({ selectFirstMatch: false });
    }, SEARCH_DEBOUNCE_MS);
  };

  const stopQueryWatch = scope.watch((watchScope) => {
    watchScope.get(contentSearchIsOpen$);
    watchScope.get(contentSearchQuery$);
    watchScope.get(contentSearchDomain$);

    scheduleDebouncedSearch();
    return undefined;
  });

  const stopEnsureVisibleWatch = scope.watch((watchScope) => {
    const result = watchScope.get(contentSearchResult$);
    const activeIndex = watchScope.get(contentSearchActiveIndex$);
    if (result == null || activeIndex == null) {
      lastEnsuredVisibleMatchKey = null;
      return undefined;
    }

    const visibleMatchKey = `${result.runId}:${activeIndex}`;
    if (visibleMatchKey === lastEnsuredVisibleMatchKey) {
      return undefined;
    }
    lastEnsuredVisibleMatchKey = visibleMatchKey;

    void ensureVisibleForIndex(sources, result, activeIndex);
    return undefined;
  });

  return (): void => {
    isDisposed = true;
    if (scope.get(contentSearchOrchestration$) === orchestration) {
      scope.set(contentSearchOrchestration$, null);
    }
    stopQueryWatch();
    stopEnsureVisibleWatch();
    clearDebouncedSearch();
    searchAbortController?.abort();
  };
}

export function normalizeContentSearchIndex(
  index: number,
  totalMatches: number,
): number {
  if (totalMatches <= 0) {
    return 0;
  }

  const modulo = index % totalMatches;
  if (modulo < 0) {
    return modulo + totalMatches;
  }

  return modulo;
}

async function ensureVisibleForIndex(
  sources: ContentSearchOrchestrationSources,
  searchResult: SearchResult,
  index: number,
): Promise<void> {
  const match = searchResult.matches[index];
  if (match == null) {
    return;
  }

  const source = getSourceForDomain({
    domain: match.location.domain,
    conversationSource: sources.conversationSource,
    diffSource: sources.diffSource,
  });
  if (source == null) {
    return;
  }

  await source.ensureVisible(match.location);
}

function createEmptyResult(
  request: SearchRequest,
  runId: number,
): SearchResult {
  return {
    runId,
    domain: request.domain,
    contextId: request.contextId,
    query: request.query,
    matches: [],
    totalMatches: 0,
    isCapped: false,
  };
}

function getSourceForDomain({
  domain,
  conversationSource,
  diffSource,
}: {
  domain: SearchDomain;
  conversationSource: SearchSource | null;
  diffSource: SearchSource | null;
}): SearchSource | null {
  switch (domain) {
    case "conversation":
      return conversationSource;
    case "diff":
      return diffSource;
  }
}
