import clsx from "clsx";
import { useSignal } from "maitai";
import { FormattedMessage } from "react-intl";

import { Spinner } from "@/components/spinner";
import { useGate } from "@/statsig/statsig";

import {
  reviewHasSelectedDiff$,
  reviewShowStageFilters$,
} from "./review-diff-state-model";
import { ReviewOverlayLayer } from "./review-overlay-layer";
import { reviewLayoutMode$ } from "./review-preferences-model";
import { ReviewSectionActionButtonsContainer } from "./review-section-action-buttons-container";

export function ReviewStageActionsPillContainer({
  expandedActionsPortalTarget,
  isAgentWorking,
}: {
  expandedActionsPortalTarget: HTMLElement | null;
  isAgentWorking: boolean;
}): React.ReactElement | null {
  const gitActionsEnabled = useGate(__statsigName("codex-review-git-actions"));
  const reviewLayoutMode = useSignal(reviewLayoutMode$);
  const hasDiff = useSignal(reviewHasSelectedDiff$);
  const showStageFilters = useSignal(reviewShowStageFilters$);
  const showReviewGitActions = gitActionsEnabled && showStageFilters;
  const isReviewExpanded = reviewLayoutMode === "expanded";
  const showSectionActions = showReviewGitActions && hasDiff;
  const showWorkingPill = isReviewExpanded && isAgentWorking;

  if (!showSectionActions && !showWorkingPill) {
    return null;
  }

  const content = (
    <div className="flex items-center">
      {isReviewExpanded ? (
        <WorkingIndicatorPill
          hasTrailingContent={showSectionActions}
          isVisible={isAgentWorking}
        />
      ) : null}
      {showSectionActions ? <ReviewSectionActionButtonsContainer /> : null}
    </div>
  );

  return (
    <ReviewOverlayLayer
      expandedActionsPortalTarget={expandedActionsPortalTarget}
    >
      {content}
    </ReviewOverlayLayer>
  );
}

function WorkingIndicatorPill({
  hasTrailingContent,
  isVisible,
}: {
  hasTrailingContent: boolean;
  isVisible: boolean;
}): React.ReactElement {
  return (
    <div
      className={clsx(
        "transition-[max-width,opacity,transform,margin-right] duration-relaxed ease-basic overflow-hidden",
        hasTrailingContent && isVisible ? "mr-2" : "mr-0",
        isVisible
          ? "max-w-36 translate-x-0 opacity-100"
          : "pointer-events-none max-w-0 -translate-x-1 opacity-0",
      )}
      aria-hidden={!isVisible}
    >
      <div className="bg-token-surface-muted text-token-foreground-muted flex items-center gap-1 rounded-full px-2 py-1 text-sm leading-[18px]">
        <Spinner className="icon-2xs text-token-foreground-muted" />
        <FormattedMessage
          id="codex.review.stageActions.working"
          defaultMessage="Working…"
          description="Label shown in expanded review actions pill while the agent is still running"
        />
      </div>
    </div>
  );
}
