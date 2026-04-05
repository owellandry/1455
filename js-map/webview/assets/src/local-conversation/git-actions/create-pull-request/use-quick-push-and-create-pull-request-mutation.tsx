import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { useScope } from "maitai";
import type { ConversationId, GitCwd, HostConfig } from "protocol";
import { GlobalStateKey } from "protocol";
import { useIntl } from "react-intl";

import { toast$ } from "@/components/toaster/toast-signal";
import { useGitPushStatus } from "@/git-rpc/use-git-push-status";
import { useGlobalState } from "@/hooks/use-global-state";
import { useModelSettings } from "@/hooks/use-model-settings";
import { AppScope } from "@/scopes/app-scope";
import { useTokenUsageInfo } from "@/utils/use-token-usage-info";

import { useGitPushMutation } from "../push/use-git-push-mutation";
import {
  getQuickWorkflowBranchLabel,
  quickGitWorkflowMessages,
} from "../quick-workflow-messages";
import {
  runQuickCreatePullRequestStep,
  runQuickPushStep,
} from "../quick-workflow-steps";
import { getGitActionSourceConversationId } from "../shared/get-git-action-source-conversation-id";
import { useGeneratePullRequestMessageMutation } from "./use-generate-pull-request-message";
import { useGhCreatePr } from "./use-gh-create-pr";

export function getQuickPushAndCreatePullRequestMutationKey(
  cwd: GitCwd | null | undefined,
  hostId: string,
): Array<unknown> {
  return ["git", "quick-push-and-create-pr", cwd ?? null, hostId];
}

export function useQuickPushAndCreatePullRequestMutation({
  cwd,
  hostConfig,
  resolvePullRequestPrompt,
  conversationId,
  onPullRequestCreated,
}: {
  cwd: GitCwd;
  hostConfig: HostConfig;
  resolvePullRequestPrompt: () => Promise<string>;
  conversationId?: ConversationId | null;
  onPullRequestCreated?: (headBranch: string) => Promise<void>;
}): UseMutationResult<boolean, Error, void> {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const { data: pushStatus } = useGitPushStatus(cwd, hostConfig);
  const { modelSettings } = useModelSettings(conversationId);
  const { data: createPullRequestAsDraft } = useGlobalState(
    GlobalStateKey.GIT_CREATE_PULL_REQUEST_AS_DRAFT,
  );
  const tokenUsageInfo = useTokenUsageInfo(conversationId ?? null);
  const pullRequestSourceConversationId = getGitActionSourceConversationId({
    conversationId: conversationId ?? null,
    tokenUsageInfo,
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
    mutationKey: getQuickPushAndCreatePullRequestMutationKey(
      cwd,
      hostConfig.id,
    ),
    mutationFn: async (): Promise<boolean> => {
      if (
        cwd == null ||
        pushStatus?.branch == null ||
        pushStatus.defaultBranch == null ||
        pushMutation.isPending ||
        createPullRequestMutation.isPending ||
        generatePullRequestMessageMutation.isPending
      ) {
        return false;
      }

      const didPush = await runQuickPushStep({
        cwd,
        intl,
        scope,
        pushMutation,
        pushStatus,
      });
      if (didPush !== true) {
        return false;
      }

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
          branch: getQuickWorkflowBranchLabel(intl, pushStatus.branch),
        }),
      );
      return true;
    },
  });
}
