import { useScope, useSignal } from "maitai";
import type { DiffModeEnum } from "protocol";

import { DeferInitialRender } from "@/components/defer-initial-render";
import { ThreadRouteScope } from "@/scopes/thread-route-scope";

import { useLinguistGeneratedPaths } from "./gitattributes-linguist-generated";
import { ReviewFileDiffItem } from "./review-file-diff-item";
import { reviewFileEntries$ } from "./review-files-model";
import { ReviewFindLoadMore } from "./review-find-load-more";
import {
  loadMoreReviewFindMatches,
  reviewCappedSelectedPath$,
  reviewFindFilteredEntriesLength$,
  reviewFindModeActive$,
  reviewFindVisibleEntries$,
} from "./review-navigation-model";
import { gitMetadataQuery$ } from "./review-repository-model";

export function ReviewVisibleFileList({
  diffRefs,
  diffMode,
  isCappedMode,
  showReviewGitActions,
}: {
  diffRefs: React.RefObject<Map<string, HTMLDivElement | null>>;
  diffMode: DiffModeEnum;
  isCappedMode: boolean;
  showReviewGitActions: boolean;
}): React.ReactElement | null {
  const scope = useScope(ThreadRouteScope);
  const cappedSelectedPath = useSignal(reviewCappedSelectedPath$);
  const findModeActive = useSignal(reviewFindModeActive$);
  const findVisibleEntries = useSignal(reviewFindVisibleEntries$);
  const reviewFindFilteredEntriesLength = useSignal(
    reviewFindFilteredEntriesLength$,
  );
  const fileEntries = useSignal(reviewFileEntries$);
  const gitMetadataQuery = useSignal(gitMetadataQuery$);
  const autoCollapsedFilePaths = useLinguistGeneratedPaths({
    cwd: scope.value.cwd,
    gitRoot: gitMetadataQuery.data?.root ?? null,
    paths: fileEntries.map((entry) => entry.path),
  });
  const visiblePaths = isCappedMode
    ? findModeActive
      ? findVisibleEntries.map((entry) => entry.path)
      : cappedSelectedPath != null
        ? [cappedSelectedPath]
        : []
    : findVisibleEntries.map((entry) => entry.path);

  if (visiblePaths.length === 0) {
    return null;
  }

  function renderItem(path: string): React.ReactElement {
    const defaultOpen = !autoCollapsedFilePaths.has(path);

    return (
      <ReviewFileDiffItem
        key={`${path}:${defaultOpen ? "open" : "collapsed"}`}
        defaultOpen={defaultOpen}
        diffMode={diffMode}
        diffRefs={diffRefs}
        isCappedMode={isCappedMode}
        path={path}
        showReviewGitActions={showReviewGitActions}
        skipFindHighlight={findModeActive && cappedSelectedPath !== path}
      />
    );
  }

  if (isCappedMode) {
    return (
      <>
        {visiblePaths.map(renderItem)}
        {findModeActive &&
        visiblePaths.length < reviewFindFilteredEntriesLength ? (
          <ReviewFindLoadMore
            onClick={() => loadMoreReviewFindMatches(scope)}
          />
        ) : null}
      </>
    );
  }

  return (
    <DeferInitialRender
      defer={visiblePaths.length > 2}
      fallback={visiblePaths.slice(0, 2).map(renderItem)}
    >
      {visiblePaths.map(renderItem)}
    </DeferInitialRender>
  );
}
