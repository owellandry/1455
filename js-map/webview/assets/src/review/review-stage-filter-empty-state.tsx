import clsx from "clsx";
import { FormattedMessage } from "react-intl";

import { LargeEmptyState } from "@/components/large-empty-state";

export function ReviewStageFilterEmptyState({
  className,
  stageFilter,
}: {
  className?: string;
  stageFilter: "staged" | "unstaged";
}): React.ReactElement {
  const isStaged = stageFilter === "staged";

  return (
    <LargeEmptyState
      className={clsx("h-full", className)}
      title={
        isStaged ? (
          <FormattedMessage
            id="codex.review.stageFilter.empty.staged.title"
            defaultMessage="No staged changes"
            description="Empty state title when there are no staged changes"
          />
        ) : (
          <FormattedMessage
            id="codex.review.stageFilter.empty.unstaged.title"
            defaultMessage="No unstaged changes"
            description="Empty state title when there are no unstaged changes"
          />
        )
      }
      description={
        isStaged ? (
          <FormattedMessage
            id="codex.review.stageFilter.empty.staged.description"
            defaultMessage="Accept edits to stage them"
            description="Empty state description when there are no staged changes"
          />
        ) : (
          <FormattedMessage
            id="codex.review.stageFilter.empty.unstaged.description"
            defaultMessage="Code changes will appear here"
            description="Empty state description when there are no unstaged changes"
          />
        )
      }
    />
  );
}
