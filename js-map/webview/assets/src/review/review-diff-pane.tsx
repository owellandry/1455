import clsx from "clsx";
import { useSignal } from "maitai";
import type { DiffModeEnum } from "protocol";

import { useGate } from "@/statsig/statsig";

import {
  reviewHasSelectedDiff$,
  reviewShowStageFilters$,
} from "./review-diff-state-model";
import { FilteredFilesEmptyState } from "./review-file-tree-pane";
import { reviewIsCappedMode$ } from "./review-files-model";
import { LargeDiffBanner } from "./review-large-diff-banner";
import { REVIEW_COMPOSER_OVERLAY_HEIGHT_CSS_VAR } from "./review-mode-composer-overlay";
import {
  reviewCappedSelectedPath$,
  reviewFindModeActive$,
} from "./review-navigation-model";
import { ReviewVisibleFileList } from "./review-visible-file-list";

export function ReviewDiffPane({
  diffMode,
  diffRefs,
  isFileTreeOpen,
  isReviewExpanded,
  setScrollContainerRef,
}: {
  diffMode: DiffModeEnum;
  diffRefs: React.RefObject<Map<string, HTMLDivElement | null>>;
  isFileTreeOpen: boolean;
  isReviewExpanded: boolean;
  setScrollContainerRef: (node: HTMLDivElement | null) => void;
}): React.ReactElement {
  const gitActionsEnabled = useGate(__statsigName("codex-review-git-actions"));
  const cappedSelectedPath = useSignal(reviewCappedSelectedPath$);
  const findModeActive = useSignal(reviewFindModeActive$);
  const isCappedMode = useSignal(reviewIsCappedMode$);
  const hasDiff = useSignal(reviewHasSelectedDiff$);
  const showStageFilters = useSignal(reviewShowStageFilters$);
  const showReviewGitActions = gitActionsEnabled && showStageFilters;
  const showSectionActionButtons = showReviewGitActions && hasDiff;

  return (
    <div
      id={`review-diffs-${isFileTreeOpen ? "open" : "collapsed"}`}
      ref={setScrollContainerRef}
      data-thread-find-target="review"
      className={clsx(
        "flex h-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto [overflow-anchor:none] pb-3",
        showSectionActionButtons && !isReviewExpanded ? "pb-8" : null,
      )}
      style={
        isReviewExpanded
          ? {
              paddingBottom: `max(10rem, calc(var(${REVIEW_COMPOSER_OVERLAY_HEIGHT_CSS_VAR}, 0px) + 0.5rem))`,
            }
          : undefined
      }
    >
      <div
        className={clsx(
          "flex w-full flex-col",
          isFileTreeOpen ? "pl-0 pr-1" : "pl-0 pr-3",
        )}
      >
        {isCappedMode ? <LargeDiffBanner /> : null}
        <div className="flex flex-col gap-2">
          {isCappedMode && !findModeActive && cappedSelectedPath == null ? (
            <FilteredFilesEmptyState />
          ) : (
            <ReviewVisibleFileList
              diffRefs={diffRefs}
              diffMode={diffMode}
              isCappedMode={isCappedMode}
              showReviewGitActions={showReviewGitActions}
            />
          )}
        </div>
      </div>
    </div>
  );
}
