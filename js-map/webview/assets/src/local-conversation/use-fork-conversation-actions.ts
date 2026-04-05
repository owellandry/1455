import { useScope } from "maitai";
import type { ConversationId } from "protocol";
import { useCallback } from "react";
import { useIntl } from "react-intl";
import { useNavigate } from "react-router";

import { useAppServerManagerForConversationIdOrDefault } from "@/app-server/app-server-manager-hooks";
import { toast$ } from "@/components/toaster/toast-signal";
import { useWindowType } from "@/hooks/use-window-type";
import { useResolvedLocalEnvironmentSelection } from "@/local-conversation/local-environment-selection";
import { threadActionMessages } from "@/local-conversation/thread-actions";
import { AppScope } from "@/scopes/app-scope";
import { useGitRootForCwd } from "@/utils/git-root";
import { logger } from "@/utils/logger";
import {
  APP_SERVER_RPC_ERROR_REASON_CLOUD_REQUIREMENTS,
  getAppServerRpcErrorReason,
} from "@/utils/maybe-error-to-string";
import { usePendingWorktreeActions } from "@/worktrees-v2/pending-worktree-store";

export function useForkConversationActions({
  sourceConversationId,
  sourceWorkspaceRoot,
}: {
  sourceConversationId: ConversationId | null;
  sourceWorkspaceRoot: string | null;
}): {
  canForkIntoWorktree: boolean;
  isResponseInProgress: boolean;
  forkIntoLocal: () => Promise<void>;
  forkIntoWorktree: () => Promise<void>;
} {
  const intl = useIntl();
  const navigate = useNavigate();
  const scope = useScope(AppScope);
  const mcpManager =
    useAppServerManagerForConversationIdOrDefault(sourceConversationId);
  const { createPendingWorktree } = usePendingWorktreeActions();
  const isElectron = useWindowType() === "electron";
  const { gitRoot } = useGitRootForCwd(sourceWorkspaceRoot, {
    enabled: !!sourceWorkspaceRoot,
    hostId: mcpManager?.getHostId(),
  });
  const canForkIntoWorktree = !!gitRoot && isElectron;
  const { resolvedConfigPath } = useResolvedLocalEnvironmentSelection({
    workspaceRoot: sourceWorkspaceRoot,
  });
  const sourceConversation = sourceConversationId
    ? (mcpManager?.getConversation(sourceConversationId) ?? null)
    : null;
  const sourceCollaborationMode =
    sourceConversation?.latestCollaborationMode ?? null;
  const isResponseInProgress =
    sourceConversation?.turns.at(-1)?.status === "inProgress";

  const forkIntoLocal = useCallback(async (): Promise<void> => {
    if (!sourceConversationId || isResponseInProgress) {
      return;
    }
    try {
      const newConversationId = await mcpManager.forkConversationFromLatest({
        sourceConversationId,
        cwd: sourceWorkspaceRoot ?? undefined,
        workspaceRoots: [sourceWorkspaceRoot ?? "/"],
        collaborationMode: sourceCollaborationMode,
      });
      void navigate(`/local/${newConversationId}`);
    } catch (error) {
      logger.error("Error forking local task", {
        safe: {},
        sensitive: { error: error },
      });
      scope.get(toast$).danger(
        getAppServerRpcErrorReason(error) ===
          APP_SERVER_RPC_ERROR_REASON_CLOUD_REQUIREMENTS
          ? intl.formatMessage({
              id: "threadHeader.forkThreadError.cloudRequirements",
              defaultMessage:
                "Failed to fork thread. Please log out and sign in again",
              description:
                "Error shown when forking a local thread fails because cloud requirements could not be loaded",
            })
          : intl.formatMessage(threadActionMessages.forkThreadError),
      );
    }
  }, [
    scope,
    intl,
    isResponseInProgress,
    mcpManager,
    navigate,
    sourceCollaborationMode,
    sourceConversationId,
    sourceWorkspaceRoot,
  ]);

  const forkIntoWorktree = useCallback(async (): Promise<void> => {
    if (!sourceConversationId || isResponseInProgress || mcpManager == null) {
      return;
    }
    if (!canForkIntoWorktree || !sourceWorkspaceRoot) {
      scope
        .get(toast$)
        .danger(
          intl.formatMessage(threadActionMessages.forkThreadRequiresGitRepo),
        );
      return;
    }

    const pendingWorktreeId = createPendingWorktree({
      hostId: mcpManager.getHostId(),
      label: intl.formatMessage(threadActionMessages.forkPendingWorktreeTitle),
      sourceWorkspaceRoot,
      startingState: { type: "working-tree" },
      localEnvironmentConfigPath: resolvedConfigPath,
      launchMode: "fork-conversation",
      prompt: intl.formatMessage(
        threadActionMessages.forkPendingWorktreePrompt,
      ),
      startConversationParamsInput: null,
      sourceConversationId,
      sourceCollaborationMode: sourceCollaborationMode,
    });
    void navigate(`/worktree-init-v2/${pendingWorktreeId}`);
  }, [
    scope,
    createPendingWorktree,
    canForkIntoWorktree,
    intl,
    isResponseInProgress,
    mcpManager,
    navigate,
    resolvedConfigPath,
    sourceCollaborationMode,
    sourceConversationId,
    sourceWorkspaceRoot,
  ]);

  return {
    canForkIntoWorktree,
    isResponseInProgress,
    forkIntoLocal,
    forkIntoWorktree,
  };
}
