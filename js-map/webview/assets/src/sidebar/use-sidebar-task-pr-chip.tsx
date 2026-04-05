import { createGitCwd, GlobalStateKey } from "protocol";
import { useIntl, type IntlShape } from "react-intl";

import { getSubagentSourceMetadata } from "@/app-server/utils/get-subagent-source-metadata";
import type { TaskRowIconBadgeDescriptor } from "@/header/recent-tasks-menu/task-row-layout";
import type { MergedTask } from "@/header/recent-tasks-menu/use-merge-tasks";
import { useGlobalState } from "@/hooks/use-global-state";
import {
  PullRequestStatusIcon,
  PullRequestVisualStateIcon,
} from "@/pull-requests/pull-request-status";
import { getPullRequestStatusFromOutput } from "@/pull-requests/pull-request-status-utils";
import type { PullRequestStatus } from "@/pull-requests/pull-request-status-utils";
import {
  type PullRequestVisualState,
  getPullRequestButtonStatus,
  getPullRequestVisualState,
} from "@/pull-requests/pull-request-visual-state";
import { useGate } from "@/statsig/statsig";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { useFetchFromVSCode } from "@/vscode-api";

export function useSidebarTaskPrChip(
  task: MergedTask,
): TaskRowIconBadgeDescriptor | null {
  const intl = useIntl();
  const pullRequestCompoundButtonEnabled = useGate(
    __statsigName("codex-app-pr-compound-button"),
  );
  const { data: showSidebarPrIcons } = useGlobalState(
    GlobalStateKey.GIT_SHOW_SIDEBAR_PR_ICONS,
  );
  const conversation = task.kind === "local" ? task.conversation : null;
  const isSubagentChildConversation =
    conversation != null &&
    getSubagentSourceMetadata(conversation.source)?.parentThreadId != null;
  const conversationCwd = conversation?.cwd ?? null;
  const conversationBranch = conversation?.gitInfo?.branch?.trim() ?? "";
  const shouldCheckLocalPrStatus =
    showSidebarPrIcons &&
    pullRequestCompoundButtonEnabled &&
    conversation != null &&
    !isSubagentChildConversation &&
    conversationCwd != null &&
    conversationBranch.length > 0;

  const { data: ghStatus } = useFetchFromVSCode("gh-cli-status", {
    params: { hostId: conversation?.hostId },
    queryConfig: {
      enabled: shouldCheckLocalPrStatus,
      staleTime: QUERY_STALE_TIME.INFINITE,
    },
  });
  const canQueryLocalPrStatus =
    shouldCheckLocalPrStatus &&
    ghStatus != null &&
    ghStatus.isInstalled &&
    ghStatus.isAuthenticated;
  const {
    data: ghPrStatus,
    isError: isGhPrStatusError,
    isLoading: isGhPrStatusLoading,
  } = useFetchFromVSCode("gh-pr-status", {
    params: {
      cwd: createGitCwd(conversationCwd ?? "/"),
      headBranch: conversationBranch,
      hostId: conversation?.hostId,
    },
    queryConfig: {
      enabled: canQueryLocalPrStatus,
      staleTime: QUERY_STALE_TIME.INFINITE,
    },
  });

  if (!showSidebarPrIcons) {
    return null;
  }

  if (task.kind === "remote") {
    if (!pullRequestCompoundButtonEnabled) {
      return null;
    }
    const pullRequest = task.task.pull_requests?.[0]?.pull_request ?? null;
    if (!pullRequest) {
      return null;
    }
    return createPrIconBadgeDescriptor(
      getPullRequestStatusFromOutput(pullRequest),
      intl,
    );
  }

  if (task.kind !== "local") {
    return null;
  }

  if (isSubagentChildConversation) {
    return null;
  }

  if (
    !pullRequestCompoundButtonEnabled ||
    !canQueryLocalPrStatus ||
    isGhPrStatusLoading ||
    isGhPrStatusError
  ) {
    return null;
  }

  const resolvedPullRequestStatus =
    ghPrStatus?.status === "success" ? ghPrStatus : null;
  if (resolvedPullRequestStatus == null) {
    return null;
  }
  const pullRequestButtonStatus = getPullRequestButtonStatus({
    hasOpenPr: resolvedPullRequestStatus.hasOpenPr,
    isDraft: resolvedPullRequestStatus.isDraft,
    url: resolvedPullRequestStatus.url,
  });
  if (pullRequestButtonStatus == null) {
    return null;
  }

  return createLocalPrIconBadgeDescriptor(
    getPullRequestVisualState({
      canMerge: resolvedPullRequestStatus.canMerge,
      ciStatus: resolvedPullRequestStatus.ciStatus,
      status: pullRequestButtonStatus,
    }),
    intl,
  );
}

function createPrIconBadgeDescriptor(
  status: PullRequestStatus,
  intl: IntlShape,
): TaskRowIconBadgeDescriptor {
  return {
    id: "pr-status",
    icon: <PullRequestStatusIcon status={status} tone="neutral" />,
    tooltipContent: getPrStatusTooltip(status, intl),
  };
}

function createLocalPrIconBadgeDescriptor(
  state: PullRequestVisualState,
  intl: IntlShape,
): TaskRowIconBadgeDescriptor {
  return {
    id: "pr-status",
    icon: <PullRequestVisualStateIcon state={state} tone="neutral" />,
    tooltipContent: getLocalPrStatusTooltip(state, intl),
  };
}

function getPrStatusTooltip(
  status: PullRequestStatus,
  intl: IntlShape,
): string {
  switch (status) {
    case "draft":
      return intl.formatMessage({
        id: "sidebar.taskRow.pr.draft",
        defaultMessage: "Draft PR",
        description: "Tooltip shown for a draft pull request badge",
      });
    case "open":
      return intl.formatMessage({
        id: "sidebar.taskRow.pr.open",
        defaultMessage: "Open PR",
        description: "Tooltip shown for an open pull request badge",
      });
    case "merged":
      return intl.formatMessage({
        id: "sidebar.taskRow.pr.merged",
        defaultMessage: "Merged PR",
        description: "Tooltip shown for a merged pull request badge",
      });
    case "closed":
      return intl.formatMessage({
        id: "sidebar.taskRow.pr.closed",
        defaultMessage: "Closed PR",
        description: "Tooltip shown for a closed pull request badge",
      });
  }
}

function getLocalPrStatusTooltip(
  state: PullRequestVisualState,
  intl: IntlShape,
): string {
  switch (state) {
    case "draft":
      return intl.formatMessage({
        id: "sidebar.taskRow.pr.draft",
        defaultMessage: "Draft PR",
        description: "Tooltip shown for a draft pull request badge",
      });
    case "failing":
      return intl.formatMessage({
        id: "sidebar.taskRow.pr.failing",
        defaultMessage: "Failing PR",
        description: "Tooltip shown for a failing pull request badge",
      });
    case "in_progress":
      return intl.formatMessage({
        id: "sidebar.taskRow.pr.inProgress",
        defaultMessage: "In progress PR",
        description:
          "Tooltip shown for a pull request that is not yet ready to merge",
      });
    case "merged":
      return intl.formatMessage({
        id: "sidebar.taskRow.pr.merged",
        defaultMessage: "Merged PR",
        description: "Tooltip shown for a merged pull request badge",
      });
    case "ready":
      return intl.formatMessage({
        id: "sidebar.taskRow.pr.ready",
        defaultMessage: "Ready PR",
        description: "Tooltip shown for a pull request that is ready to merge",
      });
  }
}
