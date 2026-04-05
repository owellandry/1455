import { useScope, useSignal } from "maitai";
import type { DiffModeEnum } from "protocol";

import { SplitView } from "@/components/split-view";
import { ThreadRouteScope } from "@/scopes/thread-route-scope";

import { ReviewDiffPane } from "./review-diff-pane";
import { ReviewFileTreePane } from "./review-file-tree-pane";
import { reviewHasFiles$, reviewIsCappedMode$ } from "./review-files-model";
import {
  requestReviewSelectedPath,
  reviewCappedSelectedPath$,
  reviewFileSearchQuery$,
  reviewFileTreeEntries$,
  reviewFindVisibleEntries$,
  setReviewFileSearchQuery,
} from "./review-navigation-model";
import {
  reviewLayoutMode$,
  reviewShowFileTree$,
  reviewShowFileTreeInCollapsedReview$,
} from "./review-preferences-model";
import { ReviewSearchBridge } from "./review-search-bridge";
import {
  reviewActiveDiffSearchMatch$,
  reviewDiffSearchFilter$,
} from "./review-search-model";
import { useDiffScrollSync } from "./use-diff-scroll-sync";

const REVIEW_FILE_TREE_DEFAULT_LEFT_PERCENT = 75;
const REVIEW_FILE_TREE_MIN_DIFF_WIDTH = 100;
const REVIEW_FILE_TREE_MIN_WIDTH = 50;
const REVIEW_FILE_TREE_DRAWER_BREAKPOINT = 0;
const REVIEW_FILE_TREE_SPLIT_VIEW_ID = "review-workspace";

export function ReviewWorkspace({
  diffMode,
  diffResizeRef,
}: {
  diffMode: DiffModeEnum;
  diffResizeRef: (node: HTMLDivElement | null) => void;
}): React.ReactElement {
  const findVisibleEntries = useSignal(reviewFindVisibleEntries$);
  const diffSearchFilter = useSignal(reviewDiffSearchFilter$);
  const {
    activeFilePath,
    diffRefs,
    scrollContainerRef,
    selectFile,
    setSelectedPathWithoutScroll,
  } = useDiffScrollSync({
    fileEntries: findVisibleEntries,
    scrollSyncEnabled: !diffSearchFilter.active,
  });
  const hasReviewFiles = useSignal(reviewHasFiles$);
  const reviewLayoutMode = useSignal(reviewLayoutMode$);
  const isFileTreeOpen = useSignal(reviewShowFileTree$);
  const isCollapsedReviewFileTreeOpen = useSignal(
    reviewShowFileTreeInCollapsedReview$,
  );
  const scope = useScope(ThreadRouteScope);
  const isCappedMode = useSignal(reviewIsCappedMode$);
  const activeDiffSearchMatch = useSignal(reviewActiveDiffSearchMatch$);
  const cappedSelectedPath = useSignal(reviewCappedSelectedPath$);
  const fileSearchQuery = useSignal(reviewFileSearchQuery$);
  const fileTreeEntries = useSignal(reviewFileTreeEntries$);
  const isReviewExpanded = reviewLayoutMode === "expanded";
  const showFileTree =
    hasReviewFiles &&
    (isReviewExpanded ? isFileTreeOpen : isCollapsedReviewFileTreeOpen);
  const matchPath =
    activeDiffSearchMatch?.location.domain === "diff"
      ? activeDiffSearchMatch.location.path
      : undefined;

  function handleScrollContainerRef(node: HTMLDivElement | null): void {
    scrollContainerRef.current = node;
    diffResizeRef(node);
  }

  function handleSelectFile(path: string): void {
    const isVisible = fileTreeEntries.some((entry) => entry.path === path);
    if (!isVisible) {
      return;
    }

    if (isCappedMode) {
      requestReviewSelectedPath(scope, path);
      return;
    }

    selectFile(path);
  }

  return (
    <>
      <ReviewSearchBridge
        diffRefs={diffRefs}
        scrollContainerRef={scrollContainerRef}
        setSelectedPathWithoutScroll={setSelectedPathWithoutScroll}
      />
      <SplitView
        id={REVIEW_FILE_TREE_SPLIT_VIEW_ID}
        className="min-h-0 flex-1"
        defaultLeftPercent={REVIEW_FILE_TREE_DEFAULT_LEFT_PERCENT}
        drawerBreakpoint={REVIEW_FILE_TREE_DRAWER_BREAKPOINT}
        isRightOpen={showFileTree}
        left={
          <ReviewDiffPane
            diffMode={diffMode}
            diffRefs={diffRefs}
            isFileTreeOpen={showFileTree}
            isReviewExpanded={isReviewExpanded}
            setScrollContainerRef={handleScrollContainerRef}
          />
        }
        leftClassName="pl-4"
        minLeftWidth={REVIEW_FILE_TREE_MIN_DIFF_WIDTH}
        minRightWidth={REVIEW_FILE_TREE_MIN_WIDTH}
        onRightOpenChange={(isOpen) =>
          scope.set(
            isReviewExpanded
              ? reviewShowFileTree$
              : reviewShowFileTreeInCollapsedReview$,
            isOpen,
          )
        }
        right={
          <ReviewFileTreePane
            activePath={
              isCappedMode ? cappedSelectedPath : (matchPath ?? activeFilePath)
            }
            entriesCount={fileTreeEntries.length}
            isOpen={showFileTree}
            isReviewExpanded={isReviewExpanded}
            onQueryChange={(query) => setReviewFileSearchQuery(scope, query)}
            onSelectPath={handleSelectFile}
            paths={fileTreeEntries.map((entry) => entry.path)}
            searchQuery={fileSearchQuery}
          />
        }
        rightClassName="pl-2"
      />
    </>
  );
}
