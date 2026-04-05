import type {
  CommentInputItem,
  GhPullRequestCommentAttachment,
  GhPullRequestCheck,
  GhPullRequestReviewers,
  GhPullRequestReviewStatus,
} from "protocol";
import type { ReactElement, ReactNode } from "react";
import { FormattedMessage, type IntlShape } from "react-intl";

import { Spinner } from "@/components/spinner";
import CheckCircleIcon from "@/icons/check-circle.svg";
import CheckMdIcon from "@/icons/check-md.svg";
import CheckStatusSkippedIcon from "@/icons/check-status-skipped.svg";
import ClockIcon from "@/icons/clock.svg";
import CommentIcon from "@/icons/comment.svg";
import WarningIcon from "@/icons/warning.svg";
import XCircleIcon from "@/icons/x-circle.svg";

import type { PullRequestDropdownStatusKind } from "./pull-request-actions-state";
import { PullRequestChecksStatusRing } from "./pull-request-checks-status-ring";
import {
  PullRequestChecksPanel,
  PullRequestCommentsPanel,
  PullRequestReviewersPanel,
} from "./pull-request-menu-components";
import type { PullRequestStatusMenuItemConfig } from "./pull-request-menu-item-config";
import type { PullRequestAddressCommentsAction } from "./use-pull-request-address-comments-action";
import type { PullRequestMergeAction } from "./use-pull-request-merge-action";

export function buildPullRequestStatusMenuItemConfigs({
  addressCommentsAction,
  canFix,
  commentAttachments,
  fixTooltipText,
  intl,
  mergeAction,
  onFix,
  onFixCheck,
  checks,
  reviewStatus,
  reviewers,
  statusKinds,
}: {
  addressCommentsAction: PullRequestAddressCommentsAction;
  canFix: boolean;
  checks: Array<GhPullRequestCheck>;
  commentAttachments: Array<GhPullRequestCommentAttachment>;
  fixTooltipText?: string;
  intl: IntlShape;
  mergeAction: PullRequestMergeAction;
  onFix: () => void;
  onFixCheck: (check: GhPullRequestCheck) => void;
  reviewStatus: GhPullRequestReviewStatus;
  reviewers: GhPullRequestReviewers;
  statusKinds: Array<PullRequestDropdownStatusKind>;
}): Array<PullRequestStatusMenuItemConfig> {
  if (statusKinds.length === 0) {
    return [];
  }

  const commentCount = commentAttachments.length;
  const items: Array<PullRequestStatusMenuItemConfig> = [];
  const checksFlyoutContent = buildPullRequestChecksFlyoutContent({
    canFix,
    checks,
    intl,
    onFixCheck,
  });
  const checksStatusRingIcon = <PullRequestChecksStatusRing checks={checks} />;

  if (statusKinds.includes("checks-none")) {
    items.push({
      icon: (
        <ClockIcon className="icon-sm shrink-0 text-token-description-foreground" />
      ),
      key: "checks-none",
      label: (
        <FormattedMessage
          id="localConversation.pullRequest.actions.noCiChecks"
          defaultMessage="No CI checks"
          description="Status row shown when the pull request currently has no CI checks"
        />
      ),
    });
  }

  if (statusKinds.includes("checks-failing")) {
    items.push({
      accessory: (
        <FormattedMessage
          id="localConversation.pullRequest.actions.fixAll"
          defaultMessage="Fix all"
          description="Trailing label for the failing checks row in the pull request actions dropdown"
        />
      ),
      actionDisabled: !canFix,
      disabled: !canFix,
      icon: checksStatusRingIcon,
      flyoutContent: checksFlyoutContent,
      key: "checks-failing",
      label: (
        <FormattedMessage
          id="localConversation.pullRequest.actions.checksFailing"
          defaultMessage="Checks failing"
          description="Status row shown when pull request checks are failing"
        />
      ),
      onSelect: onFix,
      tooltipText: fixTooltipText,
    });
  }

  if (statusKinds.includes("checks-pending")) {
    items.push({
      flyoutContent: checksFlyoutContent,
      icon: checksStatusRingIcon,
      key: "checks-pending",
      label: (
        <FormattedMessage
          id="localConversation.pullRequest.actions.checksPending"
          defaultMessage="Checks pending"
          description="Status row shown when pull request checks are still pending"
        />
      ),
    });
  }

  if (statusKinds.includes("checks-successful")) {
    items.push({
      flyoutContent: checksFlyoutContent,
      icon: checksStatusRingIcon,
      key: "checks-successful",
      label: (
        <FormattedMessage
          id="localConversation.pullRequest.actions.checksSuccessful"
          defaultMessage="Checks successful"
          description="Status row shown when pull request checks are passing"
        />
      ),
    });
  }

  items.push(
    buildApprovalsStatusMenuItemConfig({
      flyoutContent: buildPullRequestReviewersFlyoutContent(reviewers, intl),
      intl,
      reviewStatus,
    }),
  );

  items.push(
    buildCommentsStatusMenuItemConfig({
      canAddressComments: addressCommentsAction.canAddressComments,
      commentAttachments,
      commentCount,
      intl,
      onAddressComment: (commentAttachment) => {
        addressCommentsAction.startAddressCommentsForAttachments([
          commentAttachment,
        ]);
      },
      onAddressComments: addressCommentsAction.startAddressComments,
      tooltipText: addressCommentsAction.tooltipText,
    }),
  );

  if (statusKinds.includes("merging-blocked")) {
    items.push({
      disabled: true,
      icon: <WarningIcon className="icon-sm shrink-0 text-token-charts-red" />,
      key: "merging-blocked",
      label: (
        <FormattedMessage
          id="localConversation.pullRequest.actions.mergingBlocked"
          defaultMessage="Merging blocked"
          description="Status row shown when the pull request cannot yet be merged"
        />
      ),
      tooltipText: mergeAction.tooltipText,
    });
  }

  if (statusKinds.includes("ready-to-merge")) {
    items.push({
      accessory: (
        <FormattedMessage
          id="localConversation.pullRequest.actions.merge"
          defaultMessage="Merge"
          description="Label for the merge action in the pull request actions dropdown"
        />
      ),
      disabled:
        mergeAction.mergeDisabledReason != null || mergeAction.isPending,
      icon: mergeAction.isPending ? (
        <Spinner className="icon-sm shrink-0" />
      ) : (
        <CheckMdIcon className="icon-sm shrink-0 text-token-description-foreground" />
      ),
      key: "ready-to-merge",
      label: (
        <FormattedMessage
          id="localConversation.pullRequest.actions.readyToMerge"
          defaultMessage="Ready to merge"
          description="Status row shown when the pull request is ready to merge"
        />
      ),
      onSelect: mergeAction.mergePullRequest,
      tooltipText: mergeAction.tooltipText,
    });
  }

  return items;
}

function buildCommentsStatusMenuItemConfig({
  canAddressComments,
  commentAttachments,
  commentCount,
  intl,
  onAddressComment,
  onAddressComments,
  tooltipText,
}: {
  canAddressComments: boolean;
  commentAttachments: Array<GhPullRequestCommentAttachment>;
  commentCount: number;
  intl: IntlShape;
  onAddressComment: (commentAttachment: GhPullRequestCommentAttachment) => void;
  onAddressComments: () => void;
  tooltipText?: string;
}): PullRequestStatusMenuItemConfig {
  return {
    accessory:
      commentCount > 0 ? (
        <FormattedMessage
          id="localConversation.pullRequest.actions.comments.addressAll"
          defaultMessage="Address all"
          description="Trailing label for the review comments row in the pull request actions dropdown"
        />
      ) : undefined,
    actionDisabled: !canAddressComments,
    disabled: commentCount === 0,
    flyoutContent: buildPullRequestCommentsFlyoutContent(
      canAddressComments,
      commentAttachments,
      intl,
      onAddressComment,
    ),
    icon: <CommentIcon className="icon-sm shrink-0" />,
    key: "comments",
    label:
      commentCount > 0
        ? intl.formatMessage(
            {
              id: "localConversation.pullRequest.actions.comments.count",
              defaultMessage:
                "{count, plural, one {# comment} other {# comments}}",
              description:
                "Label for the review comments row when comments are present",
            },
            { count: commentCount },
          )
        : intl.formatMessage({
            id: "localConversation.pullRequest.actions.comments.none",
            defaultMessage: "No comments",
            description:
              "Label for the review comments row when there are no comments",
          }),
    onSelect:
      commentCount > 0 && canAddressComments ? onAddressComments : undefined,
    tooltipText,
  };
}

function buildPullRequestCommentsFlyoutContent(
  canAddressComments: boolean,
  commentAttachments: Array<GhPullRequestCommentAttachment>,
  intl: IntlShape,
  onAddressComment: (commentAttachment: CommentInputItem) => void,
): ReactNode {
  if (commentAttachments.length === 0) {
    return undefined;
  }

  return (
    <PullRequestCommentsPanel
      groups={[
        {
          comments: commentAttachments.map((commentAttachment) => ({
            action: {
              disabled: !canAddressComments,
              label: intl.formatMessage({
                id: "localConversation.pullRequest.actions.comments.address",
                defaultMessage: "Address",
                description:
                  "Action button shown on an individual review comment in the comments flyout",
              }),
              onSelect: (): void => {
                onAddressComment(commentAttachment);
              },
            },
            comment: commentAttachment,
          })),
          title: intl.formatMessage({
            id: "localConversation.pullRequest.actions.comments.flyoutTitle",
            defaultMessage: "Comments",
            description:
              "Title for the pull request comments flyout in the git actions dropdown",
          }),
        },
      ]}
    />
  );
}

function buildPullRequestChecksFlyoutContent({
  canFix,
  checks,
  intl,
  onFixCheck,
}: {
  canFix: boolean;
  checks: Array<GhPullRequestCheck>;
  intl: IntlShape;
  onFixCheck: (check: GhPullRequestCheck) => void;
}): ReactElement | undefined {
  const groups = [
    buildChecksPanelGroup(
      "failing",
      checks.filter((check) => check.status === "failing"),
      intl,
      {
        actionDisabled: !canFix,
        actionLabel: intl.formatMessage({
          id: "localConversation.pullRequest.actions.checks.fix",
          defaultMessage: "Fix",
          description:
            "Per-check action label for fixing a single failing pull request check",
        }),
        onAction: onFixCheck,
      },
    ),
    buildChecksPanelGroup(
      "pending",
      checks.filter((check) => check.status === "pending"),
      intl,
    ),
    buildChecksPanelGroup(
      "skipped",
      checks.filter((check) => check.status === "skipped"),
      intl,
    ),
    buildChecksPanelGroup(
      "unknown",
      checks.filter((check) => check.status === "unknown"),
      intl,
    ),
    buildChecksPanelGroup(
      "successful",
      checks.filter((check) => check.status === "passing"),
      intl,
    ),
  ].filter((group) => group != null);

  if (groups.length === 0) {
    return undefined;
  }

  return (
    <PullRequestChecksPanel
      groups={groups}
      title={buildChecksFlyoutHeader(checks, intl)}
    />
  );
}

function buildApprovalsStatusMenuItemConfig({
  flyoutContent,
  intl,
  reviewStatus,
}: {
  flyoutContent?: ReactElement;
  intl: IntlShape;
  reviewStatus: GhPullRequestReviewStatus;
}): PullRequestStatusMenuItemConfig {
  const hasReviewers = flyoutContent != null;
  const emptyTooltipText = hasReviewers
    ? undefined
    : intl.formatMessage({
        id: "localConversation.pullRequest.actions.noRequestedReviews",
        defaultMessage: "No requested reviews",
        description:
          "Tooltip shown when the approvals row is disabled because the pull request has no requested or completed reviews",
      });

  switch (reviewStatus) {
    case "approved":
      return {
        disabled: !hasReviewers,
        flyoutContent,
        icon: (
          <CheckMdIcon className="icon-sm shrink-0 text-token-description-foreground" />
        ),
        key: "approvals-complete",
        label: (
          <FormattedMessage
            id="localConversation.pullRequest.actions.approvalsComplete"
            defaultMessage="Approvals complete"
            description="Status row shown when the pull request has the required approvals"
          />
        ),
        tooltipText: emptyTooltipText,
      };
    case "changes_requested":
      return {
        disabled: !hasReviewers,
        flyoutContent,
        icon: (
          <WarningIcon className="icon-sm shrink-0 text-token-charts-red" />
        ),
        key: "changes-requested",
        label: (
          <FormattedMessage
            id="localConversation.pullRequest.actions.changesRequested"
            defaultMessage="Changes requested"
            description="Status row shown when reviewers requested changes on the pull request"
          />
        ),
        tooltipText: emptyTooltipText,
      };
    case "review_required":
      return {
        disabled: !hasReviewers,
        flyoutContent,
        icon: (
          <ClockIcon className="icon-sm shrink-0 text-token-description-foreground" />
        ),
        key: "awaiting-review",
        label: (
          <FormattedMessage
            id="localConversation.pullRequest.actions.awaitingReview"
            defaultMessage="Awaiting review"
            description="Status row shown when the pull request is still awaiting review"
          />
        ),
        tooltipText: emptyTooltipText,
      };
    case "none":
      return {
        disabled: !hasReviewers,
        flyoutContent,
        icon: (
          <ClockIcon className="icon-sm shrink-0 text-token-description-foreground" />
        ),
        key: "no-approvals",
        label: (
          <FormattedMessage
            id="localConversation.pullRequest.actions.noApprovals"
            defaultMessage="No approvals yet"
            description="Status row shown when the pull request has no approvals yet"
          />
        ),
        tooltipText: emptyTooltipText,
      };
  }
}

function buildPullRequestReviewersFlyoutContent(
  reviewers: GhPullRequestReviewers,
  intl: IntlShape,
): ReactElement | undefined {
  const groups = [
    buildReviewerGroup("approved", reviewers.approved, intl),
    buildReviewerGroup("requested", reviewers.requested, intl),
    buildReviewerGroup("changes-requested", reviewers.changesRequested, intl),
    buildReviewerGroup(
      "commented",
      reviewers.commented.filter((reviewer) => {
        return (
          !reviewers.approved.includes(reviewer) &&
          !reviewers.requested.includes(reviewer) &&
          !reviewers.changesRequested.includes(reviewer)
        );
      }),
      intl,
    ),
  ].filter((group) => group != null);

  if (groups.length === 0) {
    return undefined;
  }

  return (
    <PullRequestReviewersPanel
      groups={groups}
      title={intl.formatMessage({
        id: "localConversation.pullRequest.actions.reviewers.title",
        defaultMessage: "Approvals",
        description: "Title shown at the top of the approvals flyout",
      })}
    />
  );
}

function buildChecksPanelGroup(
  status: "failing" | "pending" | "skipped" | "successful" | "unknown",
  checks: Array<GhPullRequestCheck>,
  intl: IntlShape,
  action:
    | {
        actionDisabled: boolean;
        actionLabel: ReactNode;
        onAction: (check: GhPullRequestCheck) => void;
      }
    | undefined = undefined,
): {
  items: Array<{
    action?: {
      disabled?: boolean;
      label: ReactNode;
      onSelect?: () => void;
    };
    description: ReactNode;
    icon: ReactElement;
    label: ReactNode;
  }>;
  title: ReactNode;
} | null {
  if (checks.length === 0) {
    return null;
  }

  return {
    items: checks.map((check) => ({
      action:
        action == null
          ? undefined
          : {
              disabled: action.actionDisabled,
              label: action.actionLabel,
              onSelect: (): void => {
                action.onAction(check);
              },
            },
      description: getCheckStatusDescription(status, intl),
      icon: getCheckStatusIcon(status),
      label: check.name,
    })),
    title: getCheckGroupTitle(status, checks.length, intl),
  };
}

function getCheckGroupTitle(
  status: "failing" | "pending" | "skipped" | "successful" | "unknown",
  count: number,
  intl: IntlShape,
): string {
  switch (status) {
    case "failing":
      return intl.formatMessage(
        {
          id: "localConversation.pullRequest.actions.checks.group.failing",
          defaultMessage:
            "{count} {statusLabel} {count, plural, one {check} other {checks}}",
          description:
            "Group title shown for failing checks in the checks flyout",
        },
        {
          count,
          statusLabel: getCheckStatusGroupLabel(status, intl),
        },
      );
    case "pending":
      return intl.formatMessage(
        {
          id: "localConversation.pullRequest.actions.checks.group.pending",
          defaultMessage:
            "{count} {statusLabel} {count, plural, one {check} other {checks}}",
          description:
            "Group title shown for pending checks in the checks flyout",
        },
        {
          count,
          statusLabel: getCheckStatusGroupLabel(status, intl),
        },
      );
    case "skipped":
      return intl.formatMessage(
        {
          id: "localConversation.pullRequest.actions.checks.group.skipped",
          defaultMessage:
            "{count} {statusLabel} {count, plural, one {check} other {checks}}",
          description:
            "Group title shown for skipped checks in the checks flyout",
        },
        {
          count,
          statusLabel: getCheckStatusGroupLabel(status, intl),
        },
      );
    case "successful":
      return intl.formatMessage(
        {
          id: "localConversation.pullRequest.actions.checks.group.successful",
          defaultMessage:
            "{count} {statusLabel} {count, plural, one {check} other {checks}}",
          description:
            "Group title shown for successful checks in the checks flyout",
        },
        {
          count,
          statusLabel: getCheckStatusGroupLabel(status, intl),
        },
      );
    case "unknown":
      return intl.formatMessage(
        {
          id: "localConversation.pullRequest.actions.checks.group.unknown",
          defaultMessage:
            "{count} {statusLabel} {count, plural, one {check} other {checks}}",
          description:
            "Group title shown for checks with unknown status in the checks flyout",
        },
        {
          count,
          statusLabel: getCheckStatusGroupLabel(status, intl),
        },
      );
  }
}

function getCheckStatusDescription(
  status: "failing" | "pending" | "skipped" | "successful" | "unknown",
  intl: IntlShape,
): ReactNode {
  switch (status) {
    case "failing":
      return intl.formatMessage({
        id: "localConversation.pullRequest.actions.checks.status.failing",
        defaultMessage: "Failing",
        description:
          "Status text shown for an individual failing check in the checks flyout",
      });
    case "pending":
      return intl.formatMessage({
        id: "localConversation.pullRequest.actions.checks.status.pending",
        defaultMessage: "Pending",
        description:
          "Status text shown for an individual pending check in the checks flyout",
      });
    case "skipped":
      return intl.formatMessage({
        id: "localConversation.pullRequest.actions.checks.status.skipped",
        defaultMessage: "Skipped",
        description:
          "Status text shown for an individual skipped check in the checks flyout",
      });
    case "successful":
      return intl.formatMessage({
        id: "localConversation.pullRequest.actions.checks.status.passed",
        defaultMessage: "Passed",
        description:
          "Status text shown for an individual successful check in the checks flyout",
      });
    case "unknown":
      return intl.formatMessage({
        id: "localConversation.pullRequest.actions.checks.status.unknown",
        defaultMessage: "Unknown",
        description:
          "Status text shown for an individual check with unknown status in the checks flyout",
      });
  }
}

function buildChecksFlyoutHeader(
  checks: Array<GhPullRequestCheck>,
  intl: IntlShape,
): ReactNode {
  const title = intl.formatMessage({
    id: "localConversation.pullRequest.actions.checksFlyoutTitle",
    defaultMessage: "Checks",
    description: "Title shown at the top of the checks flyout",
  });
  const summary = buildChecksFlyoutSummary(checks, intl);

  if (summary.length === 0) {
    return title;
  }

  return (
    <span className="flex items-baseline gap-1.5">
      <span>{title}</span>
      <span className="font-normal text-token-foreground/60">{summary}</span>
    </span>
  );
}

function buildChecksFlyoutSummary(
  checks: Array<GhPullRequestCheck>,
  intl: IntlShape,
): string {
  const summaryParts = [
    buildChecksFlyoutSummaryPart(
      checks.filter((check) => check.status === "failing").length,
      "failing",
      intl,
    ),
    buildChecksFlyoutSummaryPart(
      checks.filter((check) => check.status === "pending").length,
      "pending",
      intl,
    ),
    buildChecksFlyoutSummaryPart(
      checks.filter((check) => check.status === "skipped").length,
      "skipped",
      intl,
    ),
    buildChecksFlyoutSummaryPart(
      checks.filter((check) => check.status === "unknown").length,
      "unknown",
      intl,
    ),
    buildChecksFlyoutSummaryPart(
      checks.filter((check) => check.status === "passing").length,
      "successful",
      intl,
    ),
  ].filter((part) => part != null);

  return summaryParts.join(", ");
}

function buildChecksFlyoutSummaryPart(
  count: number,
  status: "failing" | "pending" | "skipped" | "successful" | "unknown",
  intl: IntlShape,
): string | null {
  if (count === 0) {
    return null;
  }

  switch (status) {
    case "failing":
      return intl.formatMessage(
        {
          id: "localConversation.pullRequest.actions.checksFlyoutSummary.failing",
          defaultMessage: "{count, plural, one {# failing} other {# failing}}",
          description: "Summary label for failing checks in the checks flyout",
        },
        { count },
      );
    case "pending":
      return intl.formatMessage(
        {
          id: "localConversation.pullRequest.actions.checksFlyoutSummary.pending",
          defaultMessage: "{count, plural, one {# pending} other {# pending}}",
          description: "Summary label for pending checks in the checks flyout",
        },
        { count },
      );
    case "skipped":
      return intl.formatMessage(
        {
          id: "localConversation.pullRequest.actions.checksFlyoutSummary.skipped",
          defaultMessage: "{count, plural, one {# skipped} other {# skipped}}",
          description: "Summary label for skipped checks in the checks flyout",
        },
        { count },
      );
    case "successful":
      return intl.formatMessage(
        {
          id: "localConversation.pullRequest.actions.checksFlyoutSummary.successful",
          defaultMessage:
            "{count, plural, one {# successful} other {# successful}}",
          description:
            "Summary label for successful checks in the checks flyout",
        },
        { count },
      );
    case "unknown":
      return intl.formatMessage(
        {
          id: "localConversation.pullRequest.actions.checksFlyoutSummary.unknown",
          defaultMessage: "{count, plural, one {# unknown} other {# unknown}}",
          description: "Summary label for unknown checks in the checks flyout",
        },
        { count },
      );
  }
}

function buildReviewerGroup(
  status: "approved" | "requested" | "changes-requested" | "commented",
  reviewers: Array<string>,
  intl: IntlShape,
): {
  reviewers: Array<{
    accessoryLabel: ReactNode;
    icon: ReactElement;
    label: ReactNode;
  }>;
} | null {
  if (reviewers.length === 0) {
    return null;
  }

  return {
    reviewers: reviewers.map((reviewer) => ({
      accessoryLabel: getReviewerGroupTitle(status, intl),
      icon: getReviewerStatusIcon(status),
      label: reviewer,
    })),
  };
}

function getReviewerGroupTitle(
  status: "approved" | "requested" | "changes-requested" | "commented",
  intl: IntlShape,
): string {
  switch (status) {
    case "approved":
      return intl.formatMessage({
        id: "localConversation.pullRequest.actions.reviewers.approved",
        defaultMessage: "Approved",
        description:
          "Group title for approved reviewers in the approvals flyout",
      });
    case "requested":
      return intl.formatMessage({
        id: "localConversation.pullRequest.actions.reviewers.requested",
        defaultMessage: "Awaiting approval",
        description:
          "Group title for requested reviewers in the approvals flyout",
      });
    case "changes-requested":
      return intl.formatMessage({
        id: "localConversation.pullRequest.actions.reviewers.changesRequested",
        defaultMessage: "Changes requested",
        description:
          "Group title for reviewers who requested changes in the approvals flyout",
      });
    case "commented":
      return intl.formatMessage({
        id: "localConversation.pullRequest.actions.reviewers.commented",
        defaultMessage: "Commented",
        description:
          "Group title for commenting reviewers in the approvals flyout",
      });
  }
}

function getReviewerStatusIcon(
  status: "approved" | "requested" | "changes-requested" | "commented",
): ReactElement {
  switch (status) {
    case "approved":
      return (
        <CheckMdIcon className="icon-sm shrink-0 text-token-description-foreground" />
      );
    case "requested":
      return (
        <ClockIcon className="icon-sm shrink-0 text-token-description-foreground" />
      );
    case "commented":
      return (
        <CommentIcon className="icon-sm shrink-0 text-token-description-foreground" />
      );
    case "changes-requested":
      return <WarningIcon className="icon-sm shrink-0 text-token-charts-red" />;
  }
}

function getCheckStatusGroupLabel(
  status: "failing" | "pending" | "skipped" | "successful" | "unknown",
  intl: IntlShape,
): string {
  switch (status) {
    case "failing":
      return intl.formatMessage({
        id: "localConversation.pullRequest.actions.checks.groupLabel.failing",
        defaultMessage: "failing",
        description:
          "Group label shown for failing checks in the checks flyout",
      });
    case "pending":
      return intl.formatMessage({
        id: "localConversation.pullRequest.actions.checks.groupLabel.pending",
        defaultMessage: "pending",
        description:
          "Group label shown for pending checks in the checks flyout",
      });
    case "skipped":
      return intl.formatMessage({
        id: "localConversation.pullRequest.actions.checks.groupLabel.skipped",
        defaultMessage: "skipped",
        description:
          "Group label shown for skipped checks in the checks flyout",
      });
    case "successful":
      return intl.formatMessage({
        id: "localConversation.pullRequest.actions.checks.groupLabel.successful",
        defaultMessage: "successful",
        description:
          "Group label shown for successful checks in the checks flyout",
      });
    case "unknown":
      return intl.formatMessage({
        id: "localConversation.pullRequest.actions.checks.groupLabel.unknown",
        defaultMessage: "unknown",
        description:
          "Group label shown for checks with unknown status in the checks flyout",
      });
  }
}

function getCheckStatusIcon(
  status: "failing" | "pending" | "skipped" | "successful" | "unknown",
): ReactElement {
  switch (status) {
    case "failing":
      return <XCircleIcon className="icon-sm shrink-0 text-token-charts-red" />;
    case "pending":
      return <Spinner className="icon-sm shrink-0" />;
    case "skipped":
      return (
        <CheckStatusSkippedIcon className="icon-sm shrink-0 text-token-description-foreground" />
      );
    case "successful":
      return (
        <CheckCircleIcon className="icon-sm shrink-0 text-token-charts-green" />
      );
    case "unknown":
      return (
        <ClockIcon className="icon-sm shrink-0 text-token-description-foreground" />
      );
  }
}
