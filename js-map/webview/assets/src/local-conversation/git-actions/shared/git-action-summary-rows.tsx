import clsx from "clsx";
import type { ReactElement, ReactNode } from "react";
import { FormattedMessage } from "react-intl";

import { BulletSeparator } from "@/components/bullet-separator";
import { Spinner } from "@/components/spinner";
import { TaskDiffStats } from "@/diff-stats";
import BranchIcon from "@/icons/branch.svg";

import type { CommitDiffSummary } from "../commit/commit-types";

export function GitActionBranchRow({
  label,
  target,
  targetMaxWidthClassName,
}: {
  label: ReactNode;
  target: string | null;
  targetMaxWidthClassName?: string;
}): ReactElement {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-medium text-token-foreground">{label}</span>
      <span
        className={clsx(
          "text-token-foreground flex min-w-0 items-center justify-end gap-2",
          targetMaxWidthClassName ?? "max-w-[60%]",
        )}
      >
        <BranchIcon className="icon-sm shrink-0 text-token-foreground" />
        <span className="truncate">
          {target ?? (
            <FormattedMessage
              id="review.commit.form.commitTo.none"
              defaultMessage="-"
              description="Placeholder shown when no commit target is available"
            />
          )}
        </span>
      </span>
    </div>
  );
}

export function GitActionChangesRow({
  label,
  summary,
  statusIndicator,
  commitCount = null,
  showNoChangesLabel = false,
  isLoading = false,
}: {
  label: ReactNode;
  summary: CommitDiffSummary | null;
  statusIndicator?: ReactNode;
  commitCount?: number | null;
  showNoChangesLabel?: boolean;
  isLoading?: boolean;
}): ReactElement {
  if (!summary) {
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 font-medium text-token-foreground">
          {label}
        </span>
        {isLoading ? (
          <Spinner className="icon-xs text-token-description-foreground" />
        ) : (
          <span className="text-token-description-foreground">
            <FormattedMessage
              id="review.commit.form.commitTo.none"
              defaultMessage="-"
              description="Placeholder shown when no commit target is available"
            />
          </span>
        )}
      </div>
    );
  }

  const hasChanges =
    summary.files.length > 0 ||
    summary.totalAdditions > 0 ||
    summary.totalDeletions > 0;
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="min-w-0 font-medium text-token-foreground">{label}</span>
      {showNoChangesLabel && !hasChanges ? (
        <span className="whitespace-nowrap text-token-description-foreground">
          <FormattedMessage
            id="localConversation.sync.modal.noChanges"
            defaultMessage="No changes"
            description="Label shown when there are no changes to sync"
          />
        </span>
      ) : (
        <div className="flex items-center gap-3">
          {commitCount != null && commitCount > 0 ? (
            <>
              <span className="whitespace-nowrap text-token-description-foreground">
                <FormattedMessage
                  id="review.commit.rows.commitCount"
                  defaultMessage="{count, plural, one {# commit} other {# commits}}"
                  description="Commit count shown in the commit UI"
                  values={{ count: commitCount }}
                />
              </span>
              <span className="text-token-description-foreground" aria-hidden>
                <BulletSeparator />
              </span>
            </>
          ) : null}
          <span className="whitespace-nowrap text-token-description-foreground">
            <FormattedMessage
              id="review.commit.rows.fileCount"
              defaultMessage="{count, plural, one {# file} other {# files}}"
              description="File count shown in the commit UI"
              values={{ count: summary.files.length }}
            />
          </span>
          <TaskDiffStats
            variant="color"
            linesAdded={summary.totalAdditions}
            linesRemoved={summary.totalDeletions}
          />
          {statusIndicator ? statusIndicator : null}
        </div>
      )}
    </div>
  );
}
