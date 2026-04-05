import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { useScope } from "maitai";
import type { GitCwd, HostConfig } from "protocol";
import { useIntl } from "react-intl";

import { toast$ } from "@/components/toaster/toast-signal";
import { useGitPushStatus } from "@/git-rpc/use-git-push-status";
import { useGitStableMetadata } from "@/git-rpc/use-git-stable-metadata";
import { AppScope } from "@/scopes/app-scope";

import { useGitPushMutation } from "../push/use-git-push-mutation";
import {
  getQuickWorkflowBranchLabel,
  quickGitWorkflowMessages,
} from "../quick-workflow-messages";
import { runQuickCommitStep, runQuickPushStep } from "../quick-workflow-steps";
import { useCommitMutation } from "./use-commit-mutation";

export function getQuickCommitAndPushMutationKey(
  cwd: GitCwd,
  hostId: string,
): Array<unknown> {
  return ["git", "quick-commit-and-push", cwd, hostId];
}

export function useQuickCommitAndPushMutation({
  cwd,
  hostConfig,
  resolveCommitMessage,
  canCommit = true,
  includeUnstaged,
  commitAttribution,
  forcePush = false,
  onBeforeCommit,
  onCommitSuccess,
  onPushSuccess,
}: {
  cwd: GitCwd;
  hostConfig: HostConfig;
  resolveCommitMessage: () => Promise<string | null>;
  canCommit?: boolean;
  includeUnstaged: boolean;
  commitAttribution?: string | null;
  forcePush?: boolean;
  onBeforeCommit?: () => Promise<boolean>;
  onCommitSuccess?: () => void;
  onPushSuccess?: () => void;
}): UseMutationResult<boolean, Error, void> {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const { data: gitMetadata } = useGitStableMetadata(cwd, hostConfig);
  const { data: pushStatus, refetch: refetchPushStatus } = useGitPushStatus(
    cwd,
    hostConfig,
  );
  const commitMutation = useCommitMutation({
    cwd,
    hostConfig,
    gitMetadata,
    onSuccess: () => {
      onCommitSuccess?.();
    },
  });
  const pushMutation = useGitPushMutation({ cwd, hostConfig });

  return useMutation({
    mutationKey: getQuickCommitAndPushMutationKey(cwd, hostConfig.id),
    mutationFn: async (): Promise<boolean> => {
      if (!canCommit || commitMutation.isPending || pushMutation.isPending) {
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

      scope.get(toast$).success(
        intl.formatMessage(quickGitWorkflowMessages.pushSuccess, {
          branch: getQuickWorkflowBranchLabel(intl, pushStatus?.branch),
        }),
      );
      return true;
    },
  });
}
