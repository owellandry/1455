import clsx from "clsx";
import type {
  ConversationId,
  GhPullRequestCheck,
  GhPullRequestCiStatus,
  GhPullRequestCommentAttachment,
  GhPullRequestReviewStatus,
  GhPullRequestReviewers,
  GitCwd,
} from "protocol";
import { useState, type ReactElement, type ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { CompoundButton } from "@/components/compound-button";
import { Dropdown } from "@/components/dropdown";
import { useMediaQuery } from "@/hooks/use-media-query";
import GithubMarkIcon from "@/icons/github-mark.svg";
import { messageBus } from "@/message-bus";
import type {
  PullRequestButtonStatus,
  PullRequestVisualState,
} from "@/pull-requests/pull-request-visual-state";

import type { CommitNextStep } from "./commit/commit-types";
import {
  getPullRequestDropdownStatusKinds,
  getPullRequestSecondaryAction,
} from "./pull-request/pull-request-actions-state";
import {
  PullRequestMenuActionRowContent,
  PullRequestMenuStatusRowContent,
} from "./pull-request/pull-request-menu-components";
import { buildPullRequestStatusMenuItemConfigs } from "./pull-request/pull-request-status-item-builders";
import { usePullRequestAddressCommentsAction } from "./pull-request/use-pull-request-address-comments-action";
import type { PullRequestFixDisabledReason } from "./pull-request/use-pull-request-fix-action";
import { usePullRequestFixAction } from "./pull-request/use-pull-request-fix-action";
import { usePullRequestMergeAction } from "./pull-request/use-pull-request-merge-action";
import {
  getQuickPrimaryGitActionMode,
  type QuickPrimaryGitActionMode,
} from "./quick-primary-action";
import type { GitAction, GitActionId, GitToolbarActionId } from "./types";

export type ViewPullRequestAction = {
  canMerge: boolean;
  ciStatus: GhPullRequestCiStatus;
  checks: Array<GhPullRequestCheck>;
  commentAttachments: Array<GhPullRequestCommentAttachment>;
  isLoadingUrl: boolean;
  number: number | null;
  repo: string | null;
  reviewers: GhPullRequestReviewers;
  reviewStatus: GhPullRequestReviewStatus;
  pullRequestState: PullRequestVisualState;
  status: PullRequestButtonStatus;
  url: string | null;
};

export function GitActionMenu({
  baseBranch,
  commitAction,
  canQuickCreateBranchAndCommit,
  canQuickCommitAndPush,
  canQuickCommitAndCreatePullRequest,
  canQuickPushAndCreatePullRequest,
  conversationId,
  createBranchAction,
  cwd,
  hostId,
  pendingQuickPrimaryMode = null,
  pushAction,
  createPullRequestAction,
  fixDisabledReason,
  headBranch,
  hasCurrentBranch,
  pullRequestStatusSectionEnabled,
  viewPullRequestAction,
  onOpenCreateBranch,
  onOpenActionModal,
  onQuickCreateBranchAndCommit: _onQuickCreateBranchAndCommit,
  onQuickCommitFlow: _onQuickCommitFlow,
  onQuickPushAndCreatePullRequest: _onQuickPushAndCreatePullRequest,
}: {
  baseBranch: string | null;
  commitAction: GitAction;
  canQuickCreateBranchAndCommit: boolean;
  canQuickCommitAndPush: boolean;
  canQuickCommitAndCreatePullRequest: boolean;
  canQuickPushAndCreatePullRequest: boolean;
  conversationId: ConversationId | null;
  createBranchAction: GitAction;
  cwd: GitCwd;
  hostId: string;
  pendingQuickPrimaryMode?: QuickPrimaryGitActionMode | null;
  pushAction: GitAction;
  createPullRequestAction: GitAction;
  fixDisabledReason: PullRequestFixDisabledReason | null;
  headBranch: string | null;
  hasCurrentBranch: boolean;
  pullRequestStatusSectionEnabled: boolean;
  viewPullRequestAction: ViewPullRequestAction | null;
  onOpenCreateBranch: () => void;
  onOpenActionModal: (actionId: GitActionId) => void;
  onQuickCreateBranchAndCommit: () => void;
  onQuickCommitFlow: (flow: CommitNextStep) => void;
  onQuickPushAndCreatePullRequest: () => void;
}): ReactElement {
  const intl = useIntl();
  const isCompactToolbar = useMediaQuery("(max-width: 920px)");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const primaryActions: Array<GitAction> = [
    commitAction,
    pushAction,
    createPullRequestAction,
  ].filter((action) => !action.hidden);
  const allPrimaryActionsDisabled = primaryActions.every(
    (action) => action.disabled,
  );
  const hasLoadingAction =
    primaryActions.some((action) => action.loading) ||
    !!createBranchAction.loading;
  const loadingAction = primaryActions.find((action) => action.loading);
  const primaryAction =
    loadingAction ??
    primaryActions.find((action) => !action.disabled) ??
    commitAction;
  const quickPrimaryMode =
    pendingQuickPrimaryMode ??
    getQuickPrimaryGitActionMode({
      hasCurrentBranch,
      hasOpenPr: viewPullRequestAction != null,
      hasUncommittedChanges: !commitAction.disabled,
      canCommitAndPush: canQuickCommitAndPush,
      canCommitAndCreatePullRequest: canQuickCommitAndCreatePullRequest,
      canPushAndCreatePullRequest: canQuickPushAndCreatePullRequest,
    });
  const selectedPrimaryAction =
    quickPrimaryMode === "create-branch-and-commit"
      ? createBranchAction
      : quickPrimaryMode === "push-and-create-pr"
        ? pushAction
        : quickPrimaryMode == null
          ? primaryAction
          : commitAction;
  const shouldShowViewPullRequest = viewPullRequestAction != null;
  const shouldUseViewPullRequestAsPrimary =
    shouldShowViewPullRequest && allPrimaryActionsDisabled;
  const closeDropdown = (): void => {
    setDropdownOpen(false);
  };
  const fixAction = usePullRequestFixAction({
    baseBranch,
    checks: viewPullRequestAction?.checks ?? [],
    conversationId,
    cwd,
    fixDisabledReason,
    headBranch,
    intl,
    onSuccess: closeDropdown,
    prNumber: viewPullRequestAction?.number ?? null,
  });
  const addressCommentsAction = usePullRequestAddressCommentsAction({
    actionDisabledReason: fixDisabledReason,
    baseBranch,
    commentAttachments: viewPullRequestAction?.commentAttachments ?? [],
    conversationId,
    cwd,
    headBranch,
    intl,
    onSuccess: closeDropdown,
    prNumber: viewPullRequestAction?.number ?? null,
  });
  const mergeAction = usePullRequestMergeAction({
    canMerge: viewPullRequestAction?.canMerge ?? false,
    ciStatus: viewPullRequestAction?.ciStatus ?? "none",
    cwd,
    headBranch,
    hostId,
    intl,
    number: viewPullRequestAction?.number ?? null,
    onSuccess: closeDropdown,
    repo: viewPullRequestAction?.repo ?? null,
    reviewStatus: viewPullRequestAction?.reviewStatus ?? "none",
    status: viewPullRequestAction?.status ?? "open",
  });
  const secondaryAction =
    viewPullRequestAction == null
      ? null
      : getPullRequestSecondaryAction({
          ciStatus: viewPullRequestAction.ciStatus,
          pullRequestState: viewPullRequestAction.pullRequestState,
        });
  const dropdownStatusKinds =
    viewPullRequestAction == null
      ? []
      : getPullRequestDropdownStatusKinds({
          ciStatus: viewPullRequestAction.ciStatus,
          mergeDisabledReason: mergeAction.mergeDisabledReason,
          pullRequestState: viewPullRequestAction.pullRequestState,
          secondaryAction,
        });
  const pullRequestStatusItems =
    pullRequestStatusSectionEnabled && viewPullRequestAction != null
      ? buildPullRequestStatusMenuItemConfigs({
          addressCommentsAction,
          canFix: fixAction.canFix,
          commentAttachments: viewPullRequestAction.commentAttachments,
          fixTooltipText: fixAction.tooltipText,
          intl,
          mergeAction,
          onFix: fixAction.startFix,
          onFixCheck: (check) => {
            fixAction.startFixForChecks([check]);
          },
          checks: viewPullRequestAction.checks,
          reviewStatus: viewPullRequestAction.reviewStatus,
          reviewers: viewPullRequestAction.reviewers,
          statusKinds: dropdownStatusKinds,
        })
      : [];
  const primaryTooltipLabel = shouldUseViewPullRequestAsPrimary
    ? intl.formatMessage({
        id: "localConversation.pullRequest.actions.viewPr",
        defaultMessage: "View PR",
        description: "Label for the view PR action in the git actions UI",
      })
    : (selectedPrimaryAction.tooltipText ?? selectedPrimaryAction.label);
  const primaryDisabled = shouldUseViewPullRequestAsPrimary
    ? viewPullRequestAction.isLoadingUrl
    : quickPrimaryMode === "create-branch-and-commit"
      ? !canQuickCreateBranchAndCommit || hasLoadingAction
      : quickPrimaryMode != null
        ? hasLoadingAction
        : allPrimaryActionsDisabled || hasLoadingAction;
  const handleDropdownOpenChange = (nextOpen: boolean): void => {
    setDropdownOpen(nextOpen);
  };

  const handleActionSelect = (action: GitAction, event?: Event): void => {
    if (action.disabled || action.loading) {
      return;
    }
    if (event) {
      event.preventDefault();
    }
    setDropdownOpen(false);
    if (action.id === "create-branch") {
      onOpenCreateBranch();
      return;
    }
    onOpenActionModal(action.id);
  };
  const handleViewPullRequestSelect = (event?: Event): void => {
    if (!viewPullRequestAction || viewPullRequestAction.isLoadingUrl) {
      return;
    }
    if (event) {
      event.preventDefault();
    }
    if (!viewPullRequestAction.url) {
      return;
    }
    setDropdownOpen(false);
    messageBus.dispatchMessage("open-in-browser", {
      url: viewPullRequestAction.url,
    });
  };
  const isQuickPrimaryLoading =
    !shouldUseViewPullRequestAsPrimary && pendingQuickPrimaryMode != null;

  return (
    <CompoundButton
      loading={isQuickPrimaryLoading}
      primaryDisabled={primaryDisabled}
      dropdownDisabled={hasLoadingAction}
      color="outline"
      size="toolbar"
      dropdownAlign="start"
      dropdownDir="rtl"
      primaryAriaLabel={
        shouldUseViewPullRequestAsPrimary
          ? primaryTooltipLabel
          : selectedPrimaryAction.label
      }
      tooltipContent={isCompactToolbar ? primaryTooltipLabel : undefined}
      dropdownOpen={dropdownOpen}
      onDropdownOpenChange={handleDropdownOpenChange}
      dropdownContentClassName="overflow-visible"
      dropdownContent={
        <div dir="ltr">
          <Dropdown.Title>
            <FormattedMessage
              id="localConversationPage.gitActions"
              defaultMessage="Git actions"
              description="Dropdown title for git action dropdown"
            />
          </Dropdown.Title>
          <GitActionDropdownItem
            action={commitAction}
            onSelect={handleActionSelect}
          />
          <GitActionDropdownItem
            action={pushAction}
            onSelect={handleActionSelect}
          />
          {!createPullRequestAction.hidden ? (
            <GitActionDropdownItem
              action={createPullRequestAction}
              onSelect={handleActionSelect}
            />
          ) : null}
          {shouldShowViewPullRequest ? (
            <Dropdown.Item
              disabled={viewPullRequestAction.isLoadingUrl}
              tooltipText={
                viewPullRequestAction.isLoadingUrl
                  ? intl.formatMessage({
                      id: "localConversationPage.viewPullRequestButtonLabel.loading",
                      defaultMessage: "Loading pull request…",
                      description:
                        "Tooltip shown while the pull request URL is loading",
                    })
                  : undefined
              }
              onSelect={handleViewPullRequestSelect}
            >
              <PullRequestMenuActionRowContent
                icon={<GithubMarkIcon className="icon-sm shrink-0" />}
                label={
                  <FormattedMessage
                    id="localConversation.pullRequest.actions.viewPr"
                    defaultMessage="View PR"
                    description="Label for the view PR action in the git actions UI"
                  />
                }
              />
            </Dropdown.Item>
          ) : null}
          <GitActionDropdownItem
            action={createBranchAction}
            onSelect={handleActionSelect}
          />
          {pullRequestStatusItems.length > 0 ? (
            <>
              <Dropdown.Separator paddingClassName="py-2" />
              <Dropdown.SectionLabel>
                <FormattedMessage
                  id="localConversation.pullRequest.actions.statusTitle"
                  defaultMessage="PR status"
                  description="Title for the pull request status section in the git actions dropdown"
                />
              </Dropdown.SectionLabel>
              {pullRequestStatusItems.map((item) => (
                <PullRequestStatusDropdownItem
                  actionDisabled={item.actionDisabled}
                  key={item.key}
                  accessory={item.accessory}
                  accessoryKind={item.accessoryKind}
                  disabled={item.disabled}
                  flyoutContent={item.flyoutContent}
                  icon={item.icon}
                  label={item.label}
                  onSelect={item.onSelect}
                  tooltipText={item.tooltipText}
                />
              ))}
            </>
          ) : null}
        </div>
      }
      onClick={() => {
        if (shouldUseViewPullRequestAsPrimary) {
          if (!viewPullRequestAction.url) {
            return;
          }
          messageBus.dispatchMessage("open-in-browser", {
            url: viewPullRequestAction.url,
          });
          return;
        }
        if (hasLoadingAction) {
          return;
        }
        if (quickPrimaryMode === "commit-and-push") {
          handleActionSelect(commitAction);
          return;
        }
        if (quickPrimaryMode === "commit-and-create-pr") {
          handleActionSelect(commitAction);
          return;
        }
        if (quickPrimaryMode === "push-and-create-pr") {
          handleActionSelect(pushAction);
          return;
        }
        if (quickPrimaryMode === "create-branch-and-commit") {
          handleActionSelect(createBranchAction);
          return;
        }
        handleActionSelect(primaryAction);
      }}
    >
      {shouldUseViewPullRequestAsPrimary ? (
        <span className="flex items-center gap-1.5">
          <GithubMarkIcon className="icon-sm" />
          <span className="truncate max-[920px]:hidden">
            <FormattedMessage
              id="localConversation.pullRequest.actions.viewPr"
              defaultMessage="View PR"
              description="Label for the view PR action in the git actions UI"
            />
          </span>
        </span>
      ) : (
        <span className="flex items-center gap-1.5">
          {isQuickPrimaryLoading ? null : (
            <selectedPrimaryAction.icon
              className={getGitActionIconClassName(
                quickPrimaryMode === "create-branch-and-commit"
                  ? "create-branch"
                  : quickPrimaryMode === "push-and-create-pr"
                    ? "push"
                    : primaryAction.id,
              )}
            />
          )}
          <span className="truncate max-[920px]:hidden">
            {selectedPrimaryAction.label}
          </span>
        </span>
      )}
    </CompoundButton>
  );
}

function GitActionDropdownItem({
  action,
  onSelect,
}: {
  action: GitAction;
  onSelect: (action: GitAction, event?: Event) => void;
}): ReactElement {
  return (
    <Dropdown.Item
      disabled={action.disabled || action.loading}
      tooltipText={action.tooltipText}
      onSelect={(event) => {
        onSelect(action, event);
      }}
    >
      <DropdownItem
        actionId={action.id}
        Icon={action.icon}
        label={action.label}
      />
    </Dropdown.Item>
  );
}

function PullRequestStatusDropdownItem({
  actionDisabled = false,
  accessory,
  accessoryKind,
  disabled = false,
  flyoutContent,
  icon,
  label,
  onSelect,
  tooltipText,
}: {
  actionDisabled?: boolean;
  accessory?: ReactNode;
  accessoryKind?: "icon" | "pill" | "text";
  disabled?: boolean;
  flyoutContent?: ReactNode;
  icon: ReactNode;
  label: ReactNode;
  onSelect?: () => void;
  tooltipText?: string;
}): ReactElement {
  const rowContent = (
    <PullRequestMenuStatusRowContent
      accessory={
        accessory == null
          ? null
          : accessoryKind === "icon"
            ? {
                kind: "icon",
                icon: accessory,
              }
            : onSelect != null && !actionDisabled
              ? {
                  kind: "pill",
                  label: accessory,
                }
              : {
                  kind: "text",
                  label: accessory,
                }
      }
      accessoryPlacement="start"
      icon={icon}
      label={label}
    />
  );

  if (flyoutContent != null) {
    return (
      <Dropdown.FlyoutSubmenuItem
        className="px-3 py-1"
        contentClassName="mr-px"
        contentSurface="bare"
        disabled={disabled}
        label=""
        onSelect={() => {
          if (disabled || actionDisabled) {
            return;
          }
          onSelect?.();
        }}
        tooltipAlign="center"
        tooltipText={tooltipText}
        triggerContent={rowContent}
      >
        {flyoutContent}
      </Dropdown.FlyoutSubmenuItem>
    );
  }

  return (
    <Dropdown.Item
      className="px-3 py-1"
      disabled={disabled}
      onSelect={() => {
        if (disabled || actionDisabled) {
          return;
        }
        onSelect?.();
      }}
      tooltipAlign="center"
      tooltipText={tooltipText}
    >
      {rowContent}
    </Dropdown.Item>
  );
}

function DropdownItem({
  actionId,
  Icon,
  label,
}: {
  actionId: GitToolbarActionId;
  Icon: React.ComponentType<{ className?: string }>;
  label: ReactNode;
}): ReactElement {
  return (
    <PullRequestMenuActionRowContent
      icon={
        <Icon
          className={clsx(getGitActionIconClassName(actionId), "shrink-0")}
        />
      }
      label={label}
    />
  );
}

function getGitActionIconClassName(actionId: GitToolbarActionId): string {
  return actionId === "create-pr" || actionId === "create-branch"
    ? "icon-xs"
    : "icon-sm";
}
