import type { ReactElement } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router";

import { Button } from "@/components/button";
import PullRequestOpenIcon from "@/icons/pull-request-open.svg";
import { ActionPopover } from "@/review/action-popover-primitives";

import type { CommitDiffSummary } from "../commit/commit-types";
import { DraftPullRequestToggle } from "../shared/draft-pull-request-toggle";
import { GitActionChangesRow } from "../shared/git-action-summary-rows";

export function CreatePullRequestModalInitial({
  baseBranch,
  headBranch,
  branchSummary,
  title,
  description,
  isDraft,
  existingPullRequestUrl,
  hasOpenPr,
  isPending,
  hasCwd,
  canOpenCreatePullRequestPage,
  onTitleChange,
  onDescriptionChange,
  onDraftChange,
  onCreate,
  onOpenCreatePullRequestPage,
  onOpenPullRequest,
}: {
  baseBranch: string | null;
  headBranch: string | null;
  branchSummary: CommitDiffSummary | null;
  title: string;
  description: string;
  isDraft: boolean;
  existingPullRequestUrl: string | null;
  hasOpenPr: boolean;
  isPending: boolean;
  hasCwd: boolean;
  canOpenCreatePullRequestPage: boolean;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onDraftChange: (isDraft: boolean) => void;
  onCreate: () => void;
  onOpenCreatePullRequestPage: () => void;
  onOpenPullRequest: () => void;
}): ReactElement {
  const intl = useIntl();
  const navigate = useNavigate();
  const isViewOnly = hasOpenPr || existingPullRequestUrl != null;
  const isLoading = isPending || (isViewOnly && existingPullRequestUrl == null);
  const canCreate =
    hasCwd &&
    headBranch != null &&
    baseBranch != null &&
    !isLoading &&
    !isViewOnly;
  const branchLine = intl.formatMessage(
    {
      id: "localConversationPage.createPrModal.branchLine",
      defaultMessage: "{head} -> {base}",
      description: "Branch summary shown in the create PR modal",
    },
    {
      head: headBranch ?? "-",
      base: baseBranch ?? "-",
    },
  );

  return (
    <ActionPopover.Root className="gap-5">
      <ActionPopover.Header
        icon={<PullRequestOpenIcon className="icon-md text-token-foreground" />}
      />
      <div className="flex flex-col gap-1">
        <ActionPopover.Title>
          {isViewOnly ? (
            <FormattedMessage
              id="localConversationPage.createPrModal.viewTitle"
              defaultMessage="Pull request ready"
              description="Title shown when a pull request already exists"
            />
          ) : (
            <FormattedMessage
              id="localConversationPage.createPrModal.title"
              defaultMessage="Create pull request"
              description="Title for the create pull request modal"
            />
          )}
        </ActionPopover.Title>
        <div className="truncate text-[13px] leading-6 tracking-[-0.01em] text-token-description-foreground">
          {branchLine}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <GitActionChangesRow
          label={
            <FormattedMessage
              id="localConversationPage.createPrModal.changes"
              defaultMessage="Changes"
              description="Label for changes row in create PR modal"
            />
          }
          summary={branchSummary}
        />
        {isViewOnly ? (
          <div className="text-[13px] leading-6 tracking-[-0.01em] text-token-description-foreground">
            <FormattedMessage
              id="localConversationPage.createPrModal.viewDescription"
              defaultMessage="A pull request already exists for this branch."
              description="Description shown when a pull request already exists"
            />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-4">
                <label
                  className="text-[13px] leading-6 font-medium tracking-[-0.01em] text-token-foreground"
                  htmlFor="create-pr-title"
                >
                  <FormattedMessage
                    id="localConversationPage.createPrModal.titleField"
                    defaultMessage="Title"
                    description="Label for the create PR title field"
                  />
                </label>
                <button
                  type="button"
                  className="text-sm text-token-description-foreground hover:text-token-foreground"
                  onClick={() => {
                    void navigate("/settings/personalization");
                  }}
                >
                  <FormattedMessage
                    id="localConversationPage.createPrModal.customInstructionsLink"
                    defaultMessage="Custom instructions"
                    description="Link to personalization settings from the create PR modal"
                  />
                </button>
              </div>
              <input
                id="create-pr-title"
                autoFocus
                className="h-[42px] w-full rounded-xl border border-token-border bg-token-dropdown-background px-3 text-[13px] leading-6 tracking-[-0.01em] text-token-input-foreground outline-none placeholder:text-token-description-foreground"
                aria-label={intl.formatMessage({
                  id: "localConversationPage.createPrModal.titleField",
                  defaultMessage: "Title",
                  description: "Label for the create PR title field",
                })}
                placeholder={intl.formatMessage({
                  id: "localConversationPage.createPrModal.titlePlaceholder",
                  defaultMessage: "Leave blank to generate",
                  description: "Placeholder for the create PR title field",
                })}
                value={title}
                disabled={isLoading}
                onChange={(event) => {
                  onTitleChange(event.target.value);
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                className="text-[13px] leading-6 font-medium tracking-[-0.01em] text-token-foreground"
                htmlFor="create-pr-description"
              >
                <FormattedMessage
                  id="localConversationPage.createPrModal.descriptionField"
                  defaultMessage="Description"
                  description="Label for the create PR description field"
                />
              </label>
              <textarea
                id="create-pr-description"
                rows={3}
                className="min-h-[70px] w-full resize-none rounded-xl border border-token-border bg-token-dropdown-background px-3 py-2 text-[13px] leading-6 tracking-[-0.01em] text-token-input-foreground outline-none placeholder:text-token-description-foreground"
                aria-label={intl.formatMessage({
                  id: "localConversationPage.createPrModal.descriptionField",
                  defaultMessage: "Description",
                  description: "Label for the create PR description field",
                })}
                placeholder={intl.formatMessage({
                  id: "localConversationPage.createPrModal.descriptionPlaceholder",
                  defaultMessage: "Leave blank to generate",
                  description:
                    "Placeholder for the create PR description field",
                })}
                value={description}
                disabled={isLoading}
                onChange={(event) => {
                  onDescriptionChange(event.target.value);
                }}
              />
            </div>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {!isViewOnly ? (
            <DraftPullRequestToggle
              checked={isDraft}
              disabled={isLoading}
              onChange={onDraftChange}
            />
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {!isViewOnly ? (
            <Button
              className="justify-center rounded-xl px-4 py-2 text-[13px] leading-4 tracking-[-0.01em]"
              size="toolbar"
              color="ghost"
              disabled={!canOpenCreatePullRequestPage || isLoading}
              onClick={onOpenCreatePullRequestPage}
            >
              <FormattedMessage
                id="localConversationPage.createPrModal.openPage"
                defaultMessage="Open PR page"
                description="Button label to open the pull request creation page"
              />
            </Button>
          ) : null}
          <Button
            className="min-w-[150px] justify-center rounded-xl px-4 py-2 text-[13px] leading-4 tracking-[-0.01em]"
            size="toolbar"
            color="primary"
            disabled={isViewOnly ? !existingPullRequestUrl : !canCreate}
            loading={isLoading}
            onClick={isViewOnly ? onOpenPullRequest : onCreate}
          >
            {isViewOnly ? (
              <FormattedMessage
                id="localConversationPage.createPrModal.open"
                defaultMessage="Open PR"
                description="Button label to open an existing pull request"
              />
            ) : isLoading ? (
              <FormattedMessage
                id="localConversationPage.createPullRequestButtonLabel.loading"
                defaultMessage="Creating PR…"
                description="Label for create pull request action while it is running"
              />
            ) : (
              <FormattedMessage
                id="localConversationPage.createPrModal.confirm"
                defaultMessage="Create PR"
                description="Button label to create a pull request"
              />
            )}
          </Button>
        </div>
      </div>
    </ActionPopover.Root>
  );
}
