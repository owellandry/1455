import { useAtom } from "jotai";
import type { ReactElement } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router";

import { Banner } from "@/components/banner";
import { Button } from "@/components/button";
import { Spinner } from "@/components/spinner";
import { Toggle } from "@/components/toggle";
import { Tooltip } from "@/components/tooltip";
import ArrowUpIcon from "@/icons/arrow-up.svg";
import BranchIcon from "@/icons/branch.svg";
import CommitIcon from "@/icons/commit.svg";
import GitHubMarkIcon from "@/icons/github-mark.svg";
import { ActionPopover } from "@/review/action-popover-primitives";

import { aIncludeUnstagedChanges } from "../atoms";
import { DraftPullRequestToggle } from "../shared/draft-pull-request-toggle";
import { GitActionOptionRow } from "../shared/git-action-option-row";
import {
  GitActionBranchRow,
  GitActionChangesRow,
} from "../shared/git-action-summary-rows";
import type { CommitDiffSummary, CommitNextStep } from "./commit-types";

export function CommitModalForm({
  cwd,
  isFetchingChanges,
  isFetchingUntrackedChanges,
  isCommitting,
  target,
  selectionSummary,
  message,
  setMessage,
  commitDisabled,
  hasSomeUncomittedChanges,
  hasSelectedChanges,
  nextStep,
  setNextStep,
  canCommitAndPush,
  canCommitAndCreatePullRequest,
  createPullRequestAsDraft,
  setCreatePullRequestAsDraft,
  showCreatePullRequestHint,
  commitAndPushTooltipText,
  commitAndCreatePullRequestTooltipText,
  branchUpdateWarning,
  onCommit,
}: {
  cwd: string;
  isFetchingChanges: boolean;
  isFetchingUntrackedChanges: boolean;
  isCommitting: boolean;
  target: string | null;
  selectionSummary: CommitDiffSummary | null;
  message: string;
  setMessage: (message: string) => void;
  commitDisabled: boolean;
  hasSomeUncomittedChanges: boolean;
  hasSelectedChanges: boolean;
  nextStep: CommitNextStep;
  setNextStep: (nextStep: CommitNextStep) => void;
  canCommitAndPush: boolean;
  canCommitAndCreatePullRequest: boolean;
  createPullRequestAsDraft: boolean;
  setCreatePullRequestAsDraft: (checked: boolean) => void;
  showCreatePullRequestHint: boolean;
  commitAndPushTooltipText?: string;
  commitAndCreatePullRequestTooltipText?: string;
  branchUpdateWarning: {
    checkedOutBranch: string;
    threadBranch: string;
  } | null;
  onCommit: () => void;
}): ReactElement {
  const intl = useIntl();
  const navigate = useNavigate();
  const commitDisabledReason = commitDisabled
    ? getCommitDisabledReason({
        isCommitting,
        hasSomeUncomittedChanges,
        hasSelectedChanges,
      })
    : null;
  const trackedChangesIndicator = isFetchingChanges ? (
    <Tooltip
      tooltipContent={
        <FormattedMessage
          id="review.commit.disabled.loadingDiff"
          defaultMessage="Loading diff…"
          description="Tooltip shown on the commit button while changes are loading"
        />
      }
    >
      <span className="inline-flex items-center text-token-description-foreground">
        <Spinner className="icon-xs" />
      </span>
    </Tooltip>
  ) : null;
  const untrackedChangesIndicator = isFetchingUntrackedChanges ? (
    <Tooltip
      tooltipContent={
        <FormattedMessage
          id="review.commit.untracked.loadingStats"
          defaultMessage="Loading untracked diff stats…"
          description="Tooltip shown while untracked diff stats are loading"
        />
      }
    >
      <span className="inline-flex items-center text-token-description-foreground">
        <Spinner className="icon-xs" />
      </span>
    </Tooltip>
  ) : null;
  const statusIndicator = trackedChangesIndicator ?? untrackedChangesIndicator;
  const isDraftToggleDisabled =
    isCommitting ||
    nextStep !== "commit-and-create-pr" ||
    !canCommitAndCreatePullRequest;

  return (
    <ActionPopover.Root>
      <ActionPopover.Header
        icon={<CommitIcon className="icon-md text-token-foreground" />}
      />
      <ActionPopover.Title>
        <FormattedMessage
          id="review.commit.form.title"
          defaultMessage="Commit your changes"
          description="Title for the commit modal form"
        />
      </ActionPopover.Title>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <GitActionBranchRow
            label={
              <FormattedMessage
                id="review.commit.form.commitTo"
                defaultMessage="Branch"
                description="Label for commit branch row"
              />
            }
            target={target}
          />
          <GitActionChangesRow
            label={
              <FormattedMessage
                id="review.commit.form.changesToBeCommitted"
                defaultMessage="Changes"
                description="Label for changes summary row"
              />
            }
            summary={selectionSummary}
            statusIndicator={statusIndicator}
          />
          <IncludeUnstagedRow cwd={cwd} />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium text-token-foreground">
              <FormattedMessage
                id="review.commit.messageLabel"
                defaultMessage="Commit message"
                description="Label for commit message textarea"
              />
            </span>
            <button
              type="button"
              className="text-sm text-token-description-foreground hover:text-token-foreground"
              onClick={() => {
                void navigate("/settings/personalization");
              }}
            >
              <FormattedMessage
                id="review.commit.customInstructionsLink"
                defaultMessage="Custom instructions"
                description="Link to personalization settings from the commit modal"
              />
            </button>
          </div>
          <textarea
            rows={2}
            className="w-full resize-none rounded-xl border border-token-border bg-token-editor-background px-3 py-2 text-token-input-foreground shadow-sm outline-none"
            autoFocus
            aria-label={intl.formatMessage({
              id: "review.commit.messageLabel",
              defaultMessage: "Commit message",
              description: "Label for commit message textarea",
            })}
            placeholder={intl.formatMessage({
              id: "review.commit.messagePlaceholder",
              defaultMessage: "Leave blank to autogenerate a commit message",
              description: "Placeholder for commit message textarea",
            })}
            value={message}
            disabled={isCommitting}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                if (!commitDisabled) {
                  onCommit();
                }
              }
            }}
            onChange={(event) => {
              setMessage(event.target.value);
            }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="font-medium text-token-foreground">
          <FormattedMessage
            id="review.commit.nextSteps"
            defaultMessage="Next steps"
            description="Label for the next steps section in the commit modal"
          />
        </span>
        <div className="flex flex-col divide-y divide-token-border overflow-hidden rounded-xl bg-token-editor-background/60">
          <GitActionOptionRow
            icon={CommitIcon}
            label={
              <FormattedMessage
                id="review.commit.nextSteps.commit"
                defaultMessage="Commit"
                description="Label for the commit-only option"
              />
            }
            selected={nextStep === "commit"}
            disabled={false}
            onSelect={() => {
              setNextStep("commit");
            }}
          />
          <GitActionOptionRow
            icon={ArrowUpIcon}
            label={
              <FormattedMessage
                id="review.commit.nextSteps.commitAndPush"
                defaultMessage="Commit & push"
                description="Label for the commit and push option"
              />
            }
            selected={nextStep === "commit-and-push"}
            disabled={!canCommitAndPush}
            tooltipText={commitAndPushTooltipText}
            onSelect={() => {
              setNextStep("commit-and-push");
            }}
          />
          <GitActionOptionRow
            icon={GitHubMarkIcon}
            label={
              <FormattedMessage
                id="review.commit.nextSteps.commitAndCreate"
                defaultMessage="Commit & create PR"
                description="Label for the commit and create PR option"
              />
            }
            description={
              showCreatePullRequestHint ? (
                <FormattedMessage
                  id="review.commit.nextSteps.prRequiresGh"
                  defaultMessage="Requires GH CLI"
                  description="Hint shown when the create pull request option needs GitHub CLI installed"
                />
              ) : null
            }
            selected={nextStep === "commit-and-create-pr"}
            disabled={!canCommitAndCreatePullRequest}
            tooltipText={commitAndCreatePullRequestTooltipText}
            onSelect={() => {
              setNextStep("commit-and-create-pr");
            }}
          />
        </div>
      </div>
      {branchUpdateWarning ? (
        <Banner
          Icon={BranchIcon}
          type="error"
          layout="verticalIcon"
          className="border-transparent bg-token-error-foreground/8 py-2.5 text-token-foreground"
          iconClassName="text-token-error-foreground"
          content={
            <FormattedMessage
              id="review.commit.branchMismatchWarning"
              defaultMessage="This thread was previously on {threadBranch}. Please confirm you want to commit to {checkedOutBranch}."
              description="Warning shown before commit when the checked out branch differs from the thread branch"
              values={{
                checkedOutBranch: (
                  <code className="inline rounded-md border border-token-border bg-token-input-background px-1.5 py-0.5 font-mono text-[12px] text-token-foreground">
                    {branchUpdateWarning.checkedOutBranch}
                  </code>
                ),
                threadBranch: (
                  <code className="inline rounded-md border border-token-border bg-token-input-background px-1.5 py-0.5 font-mono text-[12px] text-token-foreground">
                    {branchUpdateWarning.threadBranch}
                  </code>
                ),
              }}
            />
          }
        />
      ) : null}
      <div className="flex items-center gap-3">
        <DraftPullRequestToggle
          checked={createPullRequestAsDraft}
          disabled={isDraftToggleDisabled}
          onChange={setCreatePullRequestAsDraft}
        />
        <Tooltip
          disabled={!commitDisabled || commitDisabledReason == null}
          tooltipContent={commitDisabledReason}
        >
          <span className="ml-auto">
            <Button
              className="min-w-[150px] justify-center rounded-xl px-4 py-2 text-[13px] leading-4 tracking-[-0.01em]"
              color="primary"
              size="toolbar"
              disabled={commitDisabled}
              loading={isCommitting}
              onClick={onCommit}
            >
              <FormattedMessage
                id="review.commit.form.continue"
                defaultMessage="Continue"
                description="Button label to commit changes"
              />
            </Button>
          </span>
        </Tooltip>
      </div>
    </ActionPopover.Root>
  );
}

function getCommitDisabledReason({
  isCommitting,
  hasSomeUncomittedChanges,
  hasSelectedChanges,
}: {
  isCommitting: boolean;
  hasSomeUncomittedChanges: boolean;
  hasSelectedChanges: boolean;
}): ReactElement {
  if (isCommitting) {
    return (
      <FormattedMessage
        id="review.commit.disabled.committing"
        defaultMessage="Committing…"
        description="Tooltip shown on the commit button while committing"
      />
    );
  } else if (!hasSomeUncomittedChanges || !hasSelectedChanges) {
    return (
      <FormattedMessage
        id="review.commit.disabled.noChanges"
        defaultMessage="No changes to commit"
        description="Tooltip shown when there are no changes to commit"
      />
    );
  } else {
    return (
      <FormattedMessage
        id="review.commit.disabled.unavailable"
        defaultMessage="Commit is unavailable right now"
        description="Fallback tooltip shown when commit is disabled for an unknown reason"
      />
    );
  }
}

function IncludeUnstagedRow({ cwd }: { cwd: string }): ReactElement {
  const [includeUnstaged, setIncludeUnstaged] = useAtom(
    aIncludeUnstagedChanges(cwd),
  );
  const intl = useIntl();

  return (
    <div className="flex items-center gap-3 pl-1">
      <Toggle
        checked={includeUnstaged}
        ariaLabel={intl.formatMessage({
          id: "review.commit.ariaLabel.includeUnstaged",
          defaultMessage: "Include unstaged",
          description:
            "Aria label for the toggle to stage unstaged changes before committing",
        })}
        onChange={(checked) => {
          setIncludeUnstaged(checked);
        }}
      />
      <span className="text-token-foreground">
        <FormattedMessage
          id="review.commit.includeUnstaged"
          defaultMessage="Include unstaged"
          description="Label for the toggle to stage unstaged changes before committing"
        />
      </span>
    </div>
  );
}
