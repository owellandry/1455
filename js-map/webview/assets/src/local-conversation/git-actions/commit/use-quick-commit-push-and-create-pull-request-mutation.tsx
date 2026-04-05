import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { useScope } from "maitai";
import {
  type ConversationId,
  type GitCwd,
  GlobalStateKey,
  type HostConfig,
} from "protocol";
import { useIntl } from "react-intl";

import { toast$ } from "@/components/toaster/toast-signal";
import { useGitPushStatus } from "@/git-rpc/use-git-push-status";
import { useGitStableMetadata } from "@/git-rpc/use-git-stable-metadata";
import { useGlobalState } from "@/hooks/use-global-state";
import { useModelSettings } from "@/hooks/use-model-settings";
import { AppScope } from "@/scopes/app-scope";
import { useTokenUsageInfo } from "@/utils/use-token-usage-info";

import { useGeneratePullRequestMessageMutation } from "../create-pull-request/use-generate-pull-request-message";
import { useGhCreatePr } from "../create-pull-request/use-gh-create-pr";
import { useGitPushMutation } from "../push/use-git-push-mutation";
import {
  getQuickWorkflowBranchLabel,
  quickGitWorkflowMessages,
} from "../quick-workflow-messages";
import {
  runQuickCommitStep,
  runQuickCreatePullRequestStep,
  runQuickPushStep,
} from "../quick-workflow-steps";
import { getGitActionSourceConversationId } from "../shared/get-git-action-source-conversation-id";
import { useCommitMutation } from "./use-commit-mutation";

export function getQuickCommitPushAndCreatePullRequestMutationKey(
  cwd: GitCwd,
  hostId: string,
): Array<unknown> {
  return ["git", "quick-commit-push-and-create-pr", cwd, hostId];
}

export function useQuickCommitPushAndCreatePullRequestMutation({
  cwd,
  hostConfig,
  resolveCommitMessage,
  canCommit = true,
  includeUnstaged,
  commitAttribution,
  forcePush = false,
  resolvePullRequestPrompt,
  conversationId,
  onBeforeCommit,
  onCommitSuccess,
  onPushSuccess,
  onPullRequestCreated,
}: {
  cwd: GitCwd;
  hostConfig: HostConfig;
  resolveCommitMessage: () => Promise<string | null>;
  canCommit?: boolean;
  includeUnstaged: boolean;
  commitAttribution?: string | null;
  forcePush?: boolean;
  resolvePullRequestPrompt: () => Promise<string>;
  conversationId?: ConversationId | null;
  onBeforeCommit?: () => Promise<boolean>;
  onCommitSuccess?: () => void;
  onPushSuccess?: () => void;
  onPullRequestCreated?: (headBranch: string) => Promise<void>;
}): UseMutationResult<boolean, Error, void> {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const { data: gitMetadata } = useGitStableMetadata(cwd, hostConfig);
  const { data: pushStatus, refetch: refetchPushStatus } = useGitPushStatus(
    cwd,
    hostConfig,
  );
  const { modelSettings } = useModelSettings(conversationId);
  const { data: createPullRequestAsDraft } = useGlobalState(
    GlobalStateKey.GIT_CREATE_PULL_REQUEST_AS_DRAFT,
  );
  const tokenUsageInfo = useTokenUsageInfo(conversationId ?? null);
  const pullRequestSourceConversationId = getGitActionSourceConversationId({
    conversationId: conversationId ?? null,
    tokenUsageInfo,
  });
  const commitMutation = useCommitMutation({
    cwd,
    hostConfig,
    gitMetadata,
    onSuccess: () => {
      onCommitSuccess?.();
    },
  });
  const pushMutation = useGitPushMutation({ cwd, hostConfig });
  const createPullRequestMutation = useGhCreatePr({
    cwd,
    hostId: hostConfig.id,
  });
  const generatePullRequestMessageMutation =
    useGeneratePullRequestMessageMutation({
      cwd,
      hostId: hostConfig.id,
      conversationId: pullRequestSourceConversationId,
    });

  return useMutation({
    mutationKey: getQuickCommitPushAndCreatePullRequestMutationKey(
      cwd,
      hostConfig.id,
    ),
    mutationFn: async (): Promise<boolean> => {
      if (
        !canCommit ||
        commitMutation.isPending ||
        pushMutation.isPending ||
        createPullRequestMutation.isPending ||
        generatePullRequestMessageMutation.isPending
      ) {
        return false;
      }

      if (onBeforeCommit) {
        const canContinue = await onBeforeCommit();
        if (!canContinue) {
          return false;
        }
      }

      const didCommit = await runQuickCommitStep({
        cwd,
        intl,
        scope,
        commitMutation,
        resolveCommitMessage,
        includeUnstaged,
        commitAttribution,
      });
      if (!didCommit) {
        return false;
      }

      const didPush = await runQuickPushStep({
        cwd,
        intl,
        scope,
        pushMutation,
        pushStatus,
        forcePush,
      });
      if (!didPush) {
        return false;
      }
      void refetchPushStatus();
      onPushSuccess?.();

      const didCreatePullRequest = await runQuickCreatePullRequestStep({
        cwd,
        hostId: hostConfig.id,
        intl,
        scope,
        generatePullRequestMessageMutation,
        createPullRequestMutation,
        resolvePullRequestPrompt,
        sourceConversationId: pullRequestSourceConversationId,
        currentModel: modelSettings.model,
        pushStatus,
        createPullRequestAsDraft,
        onPullRequestCreated,
      });
      if (didCreatePullRequest !== true) {
        return false;
      }

      scope.get(toast$).success(
        intl.formatMessage(quickGitWorkflowMessages.createPullRequestSuccess, {
          branch: getQuickWorkflowBranchLabel(intl, pushStatus?.branch),
        }),
      );
      return true;
    },
  });
}
