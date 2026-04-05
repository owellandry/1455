import { useScope } from "maitai";
import {
  GlobalStateKey,
  type GhPullRequestCiStatus,
  type GhPullRequestReviewStatus,
  type GitCwd,
} from "protocol";
import type { IntlShape } from "react-intl";

import { toast$ } from "@/components/toaster/toast-signal";
import { useGlobalState } from "@/hooks/use-global-state";
import type { PullRequestButtonStatus } from "@/pull-requests/pull-request-visual-state";
import { getPullRequestVisualState } from "@/pull-requests/pull-request-visual-state";
import { AppScope } from "@/scopes/app-scope";

import {
  getPullRequestMergeDisabledReason,
  type PullRequestMergeDisabledReason,
} from "./pull-request-actions-state";
import { useGhMergePullRequest } from "./use-gh-merge-pull-request";

export type PullRequestMergeAction = {
  isPending: boolean;
  mergeDisabledReason: PullRequestMergeDisabledReason;
  mergePullRequest: () => Promise<void>;
  tooltipText?: string;
};

export function usePullRequestMergeAction({
  canMerge,
  ciStatus,
  cwd,
  headBranch,
  hostId,
  intl,
  number,
  onSuccess,
  repo,
  reviewStatus,
  status,
}: {
  canMerge: boolean;
  ciStatus: GhPullRequestCiStatus;
  cwd: GitCwd;
  headBranch: string | null;
  hostId?: string;
  intl: IntlShape;
  number: number | null;
  onSuccess: () => void;
  repo: string | null;
  reviewStatus: GhPullRequestReviewStatus;
  status: PullRequestButtonStatus;
}): PullRequestMergeAction {
  const scope = useScope(AppScope);
  const { data: pullRequestMergeMethod } = useGlobalState(
    GlobalStateKey.GIT_PULL_REQUEST_MERGE_METHOD,
  );
  const pullRequestState = getPullRequestVisualState({
    canMerge,
    ciStatus,
    status,
  });
  const mergeDisabledReason = getPullRequestMergeDisabledReason({
    canMerge,
    ciStatus,
    pullRequestState,
    reviewStatus,
  });
  const mutation = useGhMergePullRequest({
    cwd,
    headBranch,
    hostId,
    onSuccess: (result) => {
      if (result.status !== "success") {
        return;
      }
      onSuccess();
      scope.get(toast$).success(
        intl.formatMessage({
          id: "localConversation.pullRequest.merge.success",
          defaultMessage: "Merged pull request",
          description: "Toast shown when a pull request merge succeeds",
        }),
      );
    },
  });

  return {
    isPending: mutation.isPending,
    mergeDisabledReason,
    mergePullRequest: async () => {
      if (number == null || mutation.isPending || mergeDisabledReason != null) {
        return;
      }
      const result = await mutation.mutateAsync({
        cwd,
        mergeMethod: pullRequestMergeMethod,
        number,
        repo,
      });
      if (result.status === "success") {
        return;
      }
      scope.get(toast$).danger(result.error);
    },
    tooltipText: getPullRequestMergeDisabledTooltip(intl, mergeDisabledReason),
  };
}

function getPullRequestMergeDisabledTooltip(
  intl: IntlShape,
  mergeDisabledReason: PullRequestMergeDisabledReason,
): string | undefined {
  switch (mergeDisabledReason) {
    case "draft":
      return intl.formatMessage({
        id: "localConversation.pullRequest.actions.merge.disabled.draft",
        defaultMessage: "Draft pull requests cannot be merged.",
        description:
          "Tooltip shown when merge is disabled for a draft pull request in the pull request actions dropdown",
      });
    case "merged":
      return intl.formatMessage({
        id: "localConversation.pullRequest.actions.merge.disabled.merged",
        defaultMessage: "This pull request is already merged.",
        description:
          "Tooltip shown when merge is disabled for a merged pull request in the pull request actions dropdown",
      });
    case "pending-ci":
      return intl.formatMessage({
        id: "localConversation.pullRequest.actions.merge.disabled.pending",
        defaultMessage: "Wait for pull request checks to finish.",
        description:
          "Tooltip shown when merge is disabled while pull request checks are pending",
      });
    case "changes-requested":
      return intl.formatMessage({
        id: "localConversation.pullRequest.actions.merge.disabled.changesRequested",
        defaultMessage: "Address requested changes before merging.",
        description:
          "Tooltip shown when merge is disabled because changes were requested on the pull request",
      });
    case "not-ready":
      return intl.formatMessage({
        id: "localConversation.pullRequest.actions.merge.disabled.notReady",
        defaultMessage:
          "This pull request still needs attention before merging.",
        description:
          "Tooltip shown when merge is disabled because the pull request is otherwise not ready",
      });
    case null:
      return undefined;
  }
}
