import clsx from "clsx";
import { useSignal } from "maitai";
import { FormattedMessage } from "react-intl";

import { LargeEmptyState } from "@/components/large-empty-state";

import { isStageDiffFilter, reviewDiffFilter$ } from "./diff-filter";
import { ReviewEmptyStateIllustration } from "./review-empty-state-illustration";

export function NoDiff({
  hasLastTurnDiff,
  className,
  showGitRepoEmptyState = false,
  gitRepoActions,
  gitRepoErrorMessage,
}: {
  hasLastTurnDiff: boolean;
  className?: string;
  showGitRepoEmptyState?: boolean;
  gitRepoActions?: React.ReactNode;
  gitRepoErrorMessage?: string | null;
}): React.ReactElement {
  return (
    <LargeEmptyState
      className={clsx("h-full", className)}
      illustration={<ReviewEmptyStateIllustration />}
      title={
        showGitRepoEmptyState ? (
          <FormattedMessage
            id="codex.review.noDiff.gitRepoRequired.title"
            defaultMessage="Create a Git repository"
            description="Empty state title shown when diffing isn't available without a git repo"
          />
        ) : (
          <FormattedMessage
            id="codex.review.noDiff"
            defaultMessage="No file changes yet"
            description="Label indicating a code review has no changes"
          />
        )
      }
      description={
        <BaseDiffDescriptionMessage
          hasLastTurnDiff={hasLastTurnDiff}
          showGitRepoEmptyState={showGitRepoEmptyState}
        />
      }
      actions={
        showGitRepoEmptyState ? (
          <GitRepoEmptyStateActions
            actions={gitRepoActions}
            errorMessage={gitRepoErrorMessage}
          />
        ) : null
      }
    />
  );
}

function BaseDiffDescriptionMessage({
  hasLastTurnDiff,
  showGitRepoEmptyState,
}: {
  hasLastTurnDiff: boolean;
  showGitRepoEmptyState: boolean;
}): React.ReactElement | null {
  const diffFilter = useSignal(reviewDiffFilter$);
  if (showGitRepoEmptyState) {
    return (
      <FormattedMessage
        id="codex.review.noDiff.gitRepoRequired.description"
        defaultMessage="Track, review, and undo changes in this project."
        description="Empty state description shown when diffing isn't available without a git repo"
      />
    );
  }
  const hasLastTurnFilter = diffFilter === "last-turn";
  const baseDiff = isStageDiffFilter(diffFilter) ? "uncommitted" : "branch";
  if (!hasLastTurnDiff && hasLastTurnFilter) {
    return (
      <FormattedMessage
        id="codex.review.noDiff.orNoLongerAvailable"
        defaultMessage="The latest diffs are no longer available."
        description="Label indicating a code review is not available"
      />
    );
  } else if (!hasLastTurnDiff || !hasLastTurnFilter) {
    return hasLastTurnFilter ? null : (
      <FormattedMessage
        id="codex.review.noDiff.baseDescription"
        defaultMessage="Changes in this project will appear here."
        description="Default description shown when a review has no changes"
      />
    );
  }
  if (baseDiff === "uncommitted") {
    return (
      <FormattedMessage
        id="codex.review.noDiff.revertedOrCommitted"
        defaultMessage="The last turn was committed or reverted."
        description="Label indicating the last turn has either been reverted or committed"
      />
    );
  }
  return (
    <FormattedMessage
      id="codex.review.noDiff.reverted"
      defaultMessage="The last turn was reverted."
      description="Label indicating the last turn has been reverted"
    />
  );
}

function GitRepoEmptyStateActions({
  actions,
  errorMessage,
}: {
  actions?: React.ReactNode;
  errorMessage?: string | null;
}): React.ReactElement | null {
  if (actions == null && errorMessage == null) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {errorMessage != null ? (
        <div className="text-sm break-words text-token-error-foreground">
          <FormattedMessage
            id="codex.review.noDiff.gitInit.error"
            defaultMessage="Git init failed: {message}"
            description="Error text shown when git initialization fails from the diff empty state"
            values={{ message: errorMessage }}
          />
        </div>
      ) : null}
      {actions}
    </div>
  );
}
