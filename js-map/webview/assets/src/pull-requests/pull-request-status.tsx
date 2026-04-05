import clsx from "clsx";
import type { ComponentType, ReactElement } from "react";
import { FormattedMessage } from "react-intl";

import PullRequestClosedIcon from "@/icons/pull-request-closed.svg";
import PullRequestDraftIcon from "@/icons/pull-request-draft.svg";
import PullRequestMergedIcon from "@/icons/pull-request-merged.svg";
import PullRequestOpenIcon from "@/icons/pull-request-open.svg";
import type { PullRequestStatus } from "@/pull-requests/pull-request-status-utils";
import type { PullRequestVisualState } from "@/pull-requests/pull-request-visual-state";

export function PullRequestStatusIcon({
  status,
  className,
  tone = "status",
}: {
  status: PullRequestStatus;
  className?: string;
  tone?: "neutral" | "status";
}): ReactElement {
  const { Icon, iconClassName } = getPullRequestStatusPresentation({
    status,
    tone,
  });

  return <Icon className={clsx(className, iconClassName)} />;
}

export function PullRequestVisualStateIcon({
  className,
  state,
  tone = "status",
}: {
  className?: string;
  state: PullRequestVisualState;
  tone?: "neutral" | "status";
}): ReactElement {
  const { Icon, iconClassName } = getPullRequestVisualStatePresentation({
    state,
    tone,
  });

  return <Icon className={clsx(className, iconClassName)} />;
}

export function PullRequestLabel({
  number,
}: {
  number: number | null;
}): ReactElement {
  return number != null ? (
    <FormattedMessage
      id="localConversationPage.pullRequestButtonLabel.withNumber"
      defaultMessage="PR {number}"
      description="Label for the pull request button when the PR number is known"
      values={{ number }}
    />
  ) : (
    <FormattedMessage
      id="localConversationPage.pullRequestButtonLabel"
      defaultMessage="PR"
      description="Label for the pull request button when the PR number is unavailable"
    />
  );
}

const PULL_REQUEST_STATUS_PRESENTATION: Record<
  PullRequestStatus,
  ComponentType<{ className?: string }>
> = {
  draft: PullRequestDraftIcon,
  open: PullRequestOpenIcon,
  merged: PullRequestMergedIcon,
  closed: PullRequestClosedIcon,
};

const PULL_REQUEST_STATUS_ICON_CLASS_NAMES: Record<PullRequestStatus, string> =
  {
    draft: "text-token-description-foreground",
    open: "text-token-charts-green",
    merged: "text-token-charts-purple",
    closed: "text-token-charts-red",
  };

const PULL_REQUEST_VISUAL_STATE_ICONS: Record<
  PullRequestVisualState,
  ComponentType<{ className?: string }>
> = {
  draft: PullRequestDraftIcon,
  failing: PullRequestOpenIcon,
  in_progress: PullRequestOpenIcon,
  merged: PullRequestMergedIcon,
  ready: PullRequestOpenIcon,
};

const PULL_REQUEST_VISUAL_STATE_ICON_CLASS_NAMES: Record<
  PullRequestVisualState,
  string
> = {
  draft: "text-token-description-foreground",
  failing: "text-token-charts-red",
  in_progress: "text-token-charts-yellow",
  merged: "text-token-charts-purple",
  ready: "text-token-charts-green",
};

const NEUTRAL_PULL_REQUEST_ICON_CLASS_NAME =
  "text-token-description-foreground";

function getPullRequestStatusPresentation({
  status,
  tone,
}: {
  status: PullRequestStatus;
  tone: "neutral" | "status";
}): {
  Icon: ComponentType<{ className?: string }>;
  iconClassName: string;
} {
  return {
    Icon: PULL_REQUEST_STATUS_PRESENTATION[status],
    iconClassName:
      tone === "neutral"
        ? NEUTRAL_PULL_REQUEST_ICON_CLASS_NAME
        : PULL_REQUEST_STATUS_ICON_CLASS_NAMES[status],
  };
}

function getPullRequestVisualStatePresentation({
  state,
  tone,
}: {
  state: PullRequestVisualState;
  tone: "neutral" | "status";
}): {
  Icon: ComponentType<{ className?: string }>;
  iconClassName: string;
} {
  return {
    Icon: PULL_REQUEST_VISUAL_STATE_ICONS[state],
    iconClassName:
      tone === "neutral"
        ? NEUTRAL_PULL_REQUEST_ICON_CLASS_NAME
        : PULL_REQUEST_VISUAL_STATE_ICON_CLASS_NAMES[state],
  };
}
