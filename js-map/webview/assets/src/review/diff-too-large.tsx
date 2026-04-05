import clsx from "clsx";
import { FormattedMessage } from "react-intl";

import { LargeEmptyState } from "@/components/large-empty-state";

import { ReviewEmptyStateIllustration } from "./review-empty-state-illustration";

export function DiffTooLarge({
  className,
}: {
  className?: string;
}): React.ReactElement {
  return (
    <LargeEmptyState
      className={clsx("h-full", className)}
      illustration={<ReviewEmptyStateIllustration />}
      title={
        <FormattedMessage
          id="codex.review.diffTooLarge.title"
          defaultMessage="Diff too large to display"
          description="Title for review empty state when diff output exceeds size limits"
        />
      }
      description={
        <FormattedMessage
          id="codex.review.diffTooLarge.description"
          defaultMessage="Open the file to review changes directly."
          description="Description shown when review diffs exceed size limits"
        />
      }
    />
  );
}
