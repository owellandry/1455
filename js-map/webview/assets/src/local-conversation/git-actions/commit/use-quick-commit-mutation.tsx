import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { useScope } from "maitai";
import type { GitCwd, HostConfig } from "protocol";
import { useIntl } from "react-intl";

import { toast$ } from "@/components/toaster/toast-signal";
import { useGitPushStatus } from "@/git-rpc/use-git-push-status";
import { useGitStableMetadata } from "@/git-rpc/use-git-stable-metadata";
import { AppScope } from "@/scopes/app-scope";

import {
  getQuickWorkflowBranchLabel,
  quickGitWorkflowMessages,
} from "../quick-workflow-messages";
import { runQuickCommitStep } from "../quick-workflow-steps";
import { useCommitMutation } from "./use-commit-mutation";

export function getQuickCommitMutationKey(
  cwd: GitCwd,
  hostId: string,
): Array<unknown> {
  return ["git", "quick-commit", cwd, hostId];
}

export function useQuickCommitMutation({
  cwd,
  hostConfig,
  resolveCommitMessage,
  canCommit = true,
  includeUnstaged,
  commitAttribution,
  onBeforeCommit,
  onCommitSuccess,
}: {
  cwd: GitCwd;
  hostConfig: HostConfig;
  resolveCommitMessage: () => Promise<string | null>;
  canCommit?: boolean;
  includeUnstaged: boolean;
  commitAttribution?: string | null;
  onBeforeCommit?: () => Promise<boolean>;
  onCommitSuccess?: () => void;
}): UseMutationResult<boolean, Error, void> {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const { data: gitMetadata } = useGitStableMetadata(cwd, hostConfig);
  const { data: pushStatus } = useGitPushStatus(cwd, hostConfig);
  const commitMutation = useCommitMutation({
    cwd,
    hostConfig,
    gitMetadata,
    onSuccess: () => {
      onCommitSuccess?.();
    },
  });

  return useMutation({
    mutationKey: getQuickCommitMutationKey(cwd, hostConfig.id),
    mutationFn: async (): Promise<boolean> => {
      if (!canCommit || commitMutation.isPending) {
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

      scope.get(toast$).success(
        intl.formatMessage(quickGitWorkflowMessages.commitSuccess, {
          branch: getQuickWorkflowBranchLabel(intl, pushStatus?.branch),
        }),
      );
      return true;
    },
  });
}
