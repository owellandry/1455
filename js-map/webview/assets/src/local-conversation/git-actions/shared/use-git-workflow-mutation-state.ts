import { useIsMutating } from "@tanstack/react-query";
import type { ConversationId, GitCwd } from "protocol";

import { getCommitMutationKey } from "../commit/use-commit-mutation";
import { getGenerateCommitMessageMutationKey } from "../commit/use-generate-commit-message";
import { getQuickCommitAndPushMutationKey } from "../commit/use-quick-commit-and-push-mutation";
import { getQuickCommitMutationKey } from "../commit/use-quick-commit-mutation";
import { getQuickCommitPushAndCreatePullRequestMutationKey } from "../commit/use-quick-commit-push-and-create-pull-request-mutation";
import { getGeneratePullRequestMessageMutationKey } from "../create-pull-request/use-generate-pull-request-message";
import { getGhCreatePrMutationKey } from "../create-pull-request/use-gh-create-pr";
import { getQuickPushAndCreatePullRequestMutationKey } from "../create-pull-request/use-quick-push-and-create-pull-request-mutation";
import { getGitPushMutationKey } from "../push/use-git-push-mutation";
import type { QuickPrimaryGitActionMode } from "../quick-primary-action";

export function useGitWorkflowMutationState({
  cwd,
  hostId,
  conversationId,
}: {
  cwd: GitCwd;
  hostId: string;
  conversationId?: ConversationId | null;
}): {
  isCommitMutating: boolean;
  isGeneratingCommitMessageMutating: boolean;
  isPushMutating: boolean;
  isCreatePullRequestFlowMutating: boolean;
  pendingQuickPrimaryMode: QuickPrimaryGitActionMode | null;
  hasGitWorkflowMutating: boolean;
} {
  const isDirectCommitMutating =
    useIsMutating({
      mutationKey: getCommitMutationKey(cwd),
    }) > 0;
  const isGeneratingCommitMessageMutating =
    useIsMutating({
      mutationKey: getGenerateCommitMessageMutationKey(
        cwd,
        hostId,
        conversationId,
      ),
    }) > 0;
  const isDirectPushMutating =
    useIsMutating({
      mutationKey: getGitPushMutationKey(cwd, hostId),
    }) > 0;
  const isDirectCreatePullRequestMutating =
    useIsMutating({
      mutationKey: getGhCreatePrMutationKey(cwd, hostId),
    }) > 0;
  const isGeneratingPullRequestMessageMutating =
    useIsMutating({
      mutationKey: getGeneratePullRequestMessageMutationKey(
        cwd,
        hostId,
        conversationId,
      ),
    }) > 0;
  const isQuickCommitMutating =
    useIsMutating({
      mutationKey: getQuickCommitMutationKey(cwd, hostId),
    }) > 0;
  const isQuickCommitAndPushMutating =
    useIsMutating({
      mutationKey: getQuickCommitAndPushMutationKey(cwd, hostId),
    }) > 0;
  const isQuickCommitPushAndCreatePullRequestMutating =
    useIsMutating({
      mutationKey: getQuickCommitPushAndCreatePullRequestMutationKey(
        cwd,
        hostId,
      ),
    }) > 0;
  const isQuickPushAndCreatePullRequestMutating =
    useIsMutating({
      mutationKey: getQuickPushAndCreatePullRequestMutationKey(cwd, hostId),
    }) > 0;

  const isCommitMutating =
    isDirectCommitMutating ||
    isQuickCommitMutating ||
    isQuickCommitAndPushMutating ||
    isQuickCommitPushAndCreatePullRequestMutating;
  const isPushMutating =
    isDirectPushMutating ||
    isQuickCommitAndPushMutating ||
    isQuickCommitPushAndCreatePullRequestMutating ||
    isQuickPushAndCreatePullRequestMutating;
  const isCreatePullRequestMutating =
    isDirectCreatePullRequestMutating ||
    isQuickCommitPushAndCreatePullRequestMutating ||
    isQuickPushAndCreatePullRequestMutating;
  const isCreatePullRequestFlowMutating =
    isCreatePullRequestMutating || isGeneratingPullRequestMessageMutating;
  const pendingQuickPrimaryMode = getPendingQuickPrimaryMode({
    isQuickCommitAndPushMutating,
    isQuickCommitPushAndCreatePullRequestMutating,
    isQuickPushAndCreatePullRequestMutating,
  });
  const hasGitWorkflowMutating =
    isCommitMutating ||
    isGeneratingCommitMessageMutating ||
    isPushMutating ||
    isCreatePullRequestFlowMutating;

  return {
    isCommitMutating,
    isGeneratingCommitMessageMutating,
    isPushMutating,
    isCreatePullRequestFlowMutating,
    pendingQuickPrimaryMode,
    hasGitWorkflowMutating,
  };
}

function getPendingQuickPrimaryMode({
  isQuickCommitAndPushMutating,
  isQuickCommitPushAndCreatePullRequestMutating,
  isQuickPushAndCreatePullRequestMutating,
}: {
  isQuickCommitAndPushMutating: boolean;
  isQuickCommitPushAndCreatePullRequestMutating: boolean;
  isQuickPushAndCreatePullRequestMutating: boolean;
}): QuickPrimaryGitActionMode | null {
  if (isQuickCommitPushAndCreatePullRequestMutating) {
    return "commit-and-create-pr";
  }
  if (isQuickCommitAndPushMutating) {
    return "commit-and-push";
  }
  if (isQuickPushAndCreatePullRequestMutating) {
    return "push-and-create-pr";
  }

  return null;
}
