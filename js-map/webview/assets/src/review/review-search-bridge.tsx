import { useScope, useSignal } from "maitai";
import type { GitReviewSearchResult } from "protocol";
import { createGitCwd } from "protocol";
import { useEffect, useMemo, useRef } from "react";

import {
  createDiffSearchSource,
  type DiffSearchFile,
} from "@/content-search/diff-source";
import { waitForLayout } from "@/content-search/scroll-to-match";
import { contentSearchDiffSource$ } from "@/content-search/search-model";
import type { SearchSource } from "@/content-search/source";
import type { DiffScrollAdapter, SearchRequest } from "@/content-search/types";
import { useDiffSearchHighlights } from "@/content-search/use-diff-search-highlights";
import type { CodexDiffFile } from "@/diff/parse-diff";
import { ThreadRouteScope } from "@/scopes/thread-route-scope";
import { workerRpcClient } from "@/worker-rpc";

import type { ReviewFileEntry } from "./review-files-model";
import { reviewFileEntries$ } from "./review-files-model";
import { requestReviewSelectedPath } from "./review-navigation-model";
import {
  repositorySource$,
  reviewSummarySource$,
} from "./review-repository-model";

export function ReviewSearchBridge({
  diffRefs,
  scrollContainerRef,
  setSelectedPathWithoutScroll,
}: {
  diffRefs: React.RefObject<Map<string, HTMLDivElement | null>>;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  setSelectedPathWithoutScroll: (path: string) => void;
}): React.ReactElement {
  const scope = useScope(ThreadRouteScope);
  const fileEntries = useSignal(reviewFileEntries$);
  const repositorySource = useSignal(repositorySource$);
  const reviewSummarySource = useSignal(reviewSummarySource$);
  const { cwd, hostConfig } = scope.value;
  const fileEntriesRef = useRef(fileEntries);
  const repositorySourceRef = useRef(repositorySource);
  const reviewSummarySourceRef = useRef(reviewSummarySource);
  const cwdRef = useRef(cwd);
  const hostConfigRef = useRef(hostConfig);
  fileEntriesRef.current = fileEntries;
  repositorySourceRef.current = repositorySource;
  reviewSummarySourceRef.current = reviewSummarySource;
  cwdRef.current = cwd;
  hostConfigRef.current = hostConfig;

  const diffScrollAdapter = useMemo((): DiffScrollAdapter => {
    return {
      scrollToFile: async (path: string): Promise<void> => {
        requestReviewSelectedPath(scope, path);
        setSelectedPathWithoutScroll(path);

        await waitForLayout();

        getReviewFileElement({
          diffRefs,
          path,
          scrollContainerRef,
        })?.scrollIntoView({
          behavior: "auto",
          block: "center",
        });

        await waitForLayout();
      },
      getFileContainer: (path: string): HTMLElement | null => {
        return getReviewFileElement({
          diffRefs,
          path,
          scrollContainerRef,
        });
      },
    };
  }, [diffRefs, scrollContainerRef, scope, setSelectedPathWithoutScroll]);
  const inMemoryDiffSearchSource = useMemo((): SearchSource => {
    return createDiffSearchSource({
      contextId: "unavailable",
      getFiles: () => buildDiffSearchFiles(fileEntriesRef.current),
      scrollAdapter: diffScrollAdapter,
    });
  }, [diffScrollAdapter]);
  const diffSearchSource = useMemo((): SearchSource => {
    return {
      ...inMemoryDiffSearchSource,
      async search(request, options) {
        const nextRepositorySource = repositorySourceRef.current;
        const nextReviewSummarySource = reviewSummarySourceRef.current;
        const nextCwd = cwdRef.current;
        const nextHostConfig = hostConfigRef.current;
        if (
          nextRepositorySource === "cloud" ||
          nextReviewSummarySource == null ||
          nextCwd == null
        ) {
          return await inMemoryDiffSearchSource.search(request, options);
        }

        const result = await workerRpcClient("git").request({
          method: "review-search",
          params: {
            cwd: createGitCwd(nextCwd),
            hostConfig: nextHostConfig,
            query: request.query,
            source: nextReviewSummarySource,
          },
          signal: options?.signal,
        });

        return getDiffSearchResultFromGitReviewSearchResult(request, result);
      },
    };
  }, [inMemoryDiffSearchSource]);
  useEffect(() => {
    scope.set(contentSearchDiffSource$, diffSearchSource);
    return (): void => {
      if (scope.get(contentSearchDiffSource$) === diffSearchSource) {
        scope.set(contentSearchDiffSource$, null);
      }
    };
  }, [diffSearchSource, scope]);
  useDiffSearchHighlights({
    containerRef: scrollContainerRef,
  });

  return <></>;
}

function buildDiffSearchFiles(
  fileEntries: Array<ReviewFileEntry>,
): Array<DiffSearchFile> {
  return fileEntries.map((entry) => {
    return {
      path: entry.path,
      hunks: entry.diff.metadata.hunks.map((hunk, index) => {
        const start = Math.min(hunk.additionStart, hunk.deletionStart);
        const additionEnd =
          hunk.additionStart + Math.max(hunk.additionCount, 0) - 1;
        const deletionEnd =
          hunk.deletionStart + Math.max(hunk.deletionCount, 0) - 1;
        const end = Math.max(start, additionEnd, deletionEnd);

        return {
          hunkId: `${index}`,
          lineEnd: end,
          lineStart: start,
          text: getDiffHunkSearchText(entry.diff, hunk),
        };
      }),
    };
  });
}

function getReviewFileElement({
  diffRefs,
  path,
  scrollContainerRef,
}: {
  diffRefs: React.RefObject<Map<string, HTMLDivElement | null>>;
  path: string;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}): HTMLElement | null {
  const fromRef = diffRefs.current.get(path);
  if (fromRef != null) {
    return fromRef;
  }

  const container = scrollContainerRef.current;
  if (container == null) {
    return null;
  }

  for (const element of container.querySelectorAll<HTMLElement>(
    "[data-review-path]",
  )) {
    if (element.dataset.reviewPath === path) {
      return element;
    }
  }

  return null;
}

function getDiffHunkSearchText(
  diff: CodexDiffFile,
  hunk: CodexDiffFile["metadata"]["hunks"][number],
): string {
  const lines = Array<string>();

  for (const content of hunk.hunkContent) {
    if (content.type === "context") {
      const contextStart = content.additionLineIndex;
      const contextEnd = contextStart + content.lines;
      appendLineRange(
        lines,
        diff.metadata.additionLines,
        contextStart,
        contextEnd,
      );
      continue;
    }

    const deletionStart = content.deletionLineIndex;
    const deletionEnd = deletionStart + content.deletions;
    appendLineRange(
      lines,
      diff.metadata.deletionLines,
      deletionStart,
      deletionEnd,
    );

    const additionStart = content.additionLineIndex;
    const additionEnd = additionStart + content.additions;
    appendLineRange(
      lines,
      diff.metadata.additionLines,
      additionStart,
      additionEnd,
    );
  }

  return lines.join("\n");
}

function appendLineRange(
  target: Array<string>,
  source: Array<string>,
  start: number,
  end: number,
): void {
  for (let index = start; index < end; index += 1) {
    if (source[index] != null) {
      target.push(source[index]);
    }
  }
}

function getDiffSearchResultFromGitReviewSearchResult(
  request: SearchRequest,
  result: GitReviewSearchResult,
): Awaited<ReturnType<SearchSource["search"]>> {
  if (result.type === "error") {
    return {
      domain: "diff",
      contextId: request.contextId,
      query: request.query.trim(),
      matches: [],
      totalMatches: 0,
      isCapped: false,
    };
  }

  return {
    domain: "diff",
    contextId: request.contextId,
    query: result.query,
    matches: result.matches.map((match, index) => {
      return {
        id: `diff:${match.path}:${match.hunkId}:${match.start}`,
        ordinal: index + 1,
        location: {
          domain: "diff",
          contextId: request.contextId,
          path: match.path,
          hunkId: match.hunkId,
          lineStart: match.lineStart,
          lineEnd: match.lineEnd,
          start: match.start,
          end: match.end,
        },
        snippet: match.snippet,
      };
    }),
    totalMatches: result.totalMatches,
    isCapped: result.isCapped,
  };
}
