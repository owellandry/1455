import NumberFlow from "@number-flow/react";
import clsx from "clsx";
import { useSignal } from "maitai";
import { FormattedMessage, useIntl } from "react-intl";

import { reviewSnapshotMetrics$ } from "./review/review-diff-state-model";

export function TaskDiffStats({
  linesAdded,
  linesRemoved,
  variant = "color",
  className,
}: {
  linesAdded: number;
  linesRemoved: number;
  variant?: "color" | "monochrome";
  className?: string;
}): React.ReactElement {
  const { locale } = useIntl();

  return (
    <span
      data-thread-find-skip
      className={clsx(
        "inline-flex items-center gap-1 disambiguated-digits tabular-nums tracking-tight",
        className,
      )}
    >
      <span
        className={clsx(
          "flex-shrink-0",
          variant === "monochrome"
            ? "text-token-input-placeholder-foreground"
            : "text-token-git-decoration-added-resource-foreground",
        )}
      >
        <FormattedMessage
          id="wham.message.modal.repoAndDiffStats.linesAdded"
          defaultMessage="+{linesAdded}"
          description="Number of lines added"
          values={{
            linesAdded: <NumberFlow locales={locale} value={linesAdded} />,
          }}
        />
      </span>
      <span
        className={clsx(
          "flex-shrink-0",
          variant === "monochrome"
            ? "text-token-input-placeholder-foreground"
            : "text-token-git-decoration-deleted-resource-foreground",
        )}
      >
        <FormattedMessage
          id="wham.message.modal.repoAndDiffStats.linesRemoved"
          defaultMessage="-{linesRemoved}"
          description="Number of lines removed"
          values={{
            linesRemoved: <NumberFlow locales={locale} value={linesRemoved} />,
          }}
        />
      </span>
    </span>
  );
}

export function ReviewDiffStats({
  className,
}: {
  className?: string;
}): React.ReactElement | null {
  const { additions, deletions } = useSignal(reviewSnapshotMetrics$);
  if (additions === 0 && deletions === 0) {
    return null;
  }
  return (
    <TaskDiffStats
      className={className}
      linesAdded={additions}
      linesRemoved={deletions}
    />
  );
}
