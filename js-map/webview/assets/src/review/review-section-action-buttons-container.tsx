import { useScope, useSignal } from "maitai";
import { FormattedMessage } from "react-intl";

import { Button } from "@/components/button";
import MinusIcon from "@/icons/minus.svg";
import PlusIcon from "@/icons/plus.svg";
import UndoIcon from "@/icons/undo.svg";
import { ThreadRouteScope } from "@/scopes/thread-route-scope";
import { useGate } from "@/statsig/statsig";

import { isStageDiffFilter, reviewDiffFilter$ } from "./diff-filter";
import {
  reviewHasSelectedDiff$,
  reviewShowStageFilters$,
} from "./review-diff-state-model";
import { requestReviewPatchAction } from "./review-patch-actions";

export function ReviewSectionActionButtonsContainer(): React.ReactElement | null {
  const scope = useScope(ThreadRouteScope);
  const gitActionsEnabled = useGate(__statsigName("codex-review-git-actions"));
  const diffFilter = useSignal(reviewDiffFilter$);
  const hasDiff = useSignal(reviewHasSelectedDiff$);
  const showStageFilters = useSignal(reviewShowStageFilters$);
  const showReviewGitActions = gitActionsEnabled && showStageFilters;

  if (!showReviewGitActions || !isStageDiffFilter(diffFilter) || !hasDiff) {
    return null;
  }

  const isStaged = diffFilter === "staged";

  return (
    <div className="flex items-center gap-2">
      {!isStaged ? (
        <Button
          className="min-w-0 gap-2 text-token-description-foreground hover:!bg-transparent hover:text-token-foreground active:!bg-transparent"
          color="ghost"
          onClick={(event) => {
            event.stopPropagation();
            void requestReviewPatchAction(scope, {
              action: "revert",
              path: "",
              scope: "section",
            });
          }}
        >
          <UndoIcon className="icon-2xs" />
          <span className="min-w-0 truncate">
            <FormattedMessage
              id="diff.actionButton.revertSectionLabel"
              defaultMessage="Revert all"
              description="Label for revert all changes button in the review action pill"
            />
          </span>
        </Button>
      ) : null}
      <Button
        className="min-w-0 gap-2 text-token-description-foreground hover:!bg-transparent hover:text-token-foreground active:!bg-transparent"
        color="ghost"
        onClick={(event) => {
          event.stopPropagation();
          void requestReviewPatchAction(scope, {
            action: isStaged ? "unstage" : "stage",
            path: "",
            scope: "section",
          });
        }}
      >
        {isStaged ? (
          <MinusIcon className="icon-2xs" />
        ) : (
          <PlusIcon className="icon-2xs" />
        )}
        <span className="min-w-0 truncate">
          {isStaged ? (
            <FormattedMessage
              id="diff.actionButton.unstageSectionLabel"
              defaultMessage="Unstage all"
              description="Label for unstage all changes button in the review action pill"
            />
          ) : (
            <FormattedMessage
              id="diff.actionButton.stageSectionLabel"
              defaultMessage="Stage all"
              description="Label for stage all changes button in the review action pill"
            />
          )}
        </span>
      </Button>
    </div>
  );
}
