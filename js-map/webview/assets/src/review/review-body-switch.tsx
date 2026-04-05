import { useSignal } from "maitai";
import type { DiffModeEnum } from "protocol";

import { LoadingPage } from "@/loading-page/loading-page";

import { reviewDiffFilter$ } from "./diff-filter";
import { DiffTooLarge } from "./diff-too-large";
import {
  reviewHasSelectedDiff$,
  reviewShowDiffTooLarge$,
  reviewShowLoading$,
  reviewShowStageFilters$,
} from "./review-diff-state-model";
import { ReviewEmptyStateController } from "./review-empty-state-controller";
import { ReviewStageFilterEmptyState } from "./review-stage-filter-empty-state";
import { ReviewWorkspace } from "./review-workspace";

export function ReviewBodySwitch({
  diffMode,
  diffResizeRef,
}: {
  diffMode: DiffModeEnum;
  diffResizeRef: (node: HTMLDivElement | null) => void;
}): React.ReactElement {
  const diffFilter = useSignal(reviewDiffFilter$);
  const hasDiff = useSignal(reviewHasSelectedDiff$);
  const showDiffTooLarge = useSignal(reviewShowDiffTooLarge$);
  const showLoading = useSignal(reviewShowLoading$);
  const showStageFilters = useSignal(reviewShowStageFilters$);

  if (showLoading) {
    return <LoadingPage />;
  }
  if (showDiffTooLarge) {
    return <DiffTooLarge className="flex-1" />;
  }
  if (hasDiff) {
    return (
      <ReviewWorkspace diffMode={diffMode} diffResizeRef={diffResizeRef} />
    );
  }
  if (showStageFilters) {
    return (
      <ReviewStageFilterEmptyState
        stageFilter={diffFilter === "staged" ? "staged" : "unstaged"}
      />
    );
  }
  return <ReviewEmptyStateController className="flex-1" />;
}
