import type { QueryClient } from "@tanstack/react-query";
import type {
  ConversationId,
  CommandExecutionOutput,
  GitCwd,
  GitRoot,
  HostConfig,
  SharedObjectValue,
} from "protocol";
import { maybeErrorToString } from "protocol";
import type { IntlShape } from "react-intl";
import { v4 as uuidv4 } from "uuid";

import type { AppServerManager } from "@/app-server/app-server-manager";
import { getHostKey } from "@/git-rpc/host-config-utils";
import { logger } from "@/utils/logger";
import { fetchFromVSCode } from "@/vscode-api";
import { workerRpcClient } from "@/worker-rpc";
import { codexWorktreesQueryKey } from "@/worktrees/worktree-query-keys";

import { getTransferredDiffCommentsState } from "./transfer-thread-diff-comments";
import { transferThreadPin } from "./transfer-thread-pin";
import { transferThreadTitle } from "./transfer-thread-title";

export type MoveToWorktreeMutationResult =
  | {
      status: "success";
      conversationId: ConversationId;
    }
  | {
      status: "error";
      message: string;
      execOutput?: CommandExecutionOutput | null;
    };

type ThreadHandoffAppServerManager = {
  archiveConversation: AppServerManager["archiveConversation"];
  forkConversationFromLatest: AppServerManager["forkConversationFromLatest"];
  getConversation: AppServerManager["getConversation"];
  setThreadTitle: AppServerManager["setThreadTitle"];
};

type ThreadHandoffQueryClient = {
  invalidateQueries: QueryClient["invalidateQueries"];
};

export async function moveToWorktree({
  conversationId,
  currentBranch,
  cwd,
  worktreeCheckoutBranch,
  selectedLocalCheckoutBranch,
  intl,
  appServerManager,
  defaultBranch,
  transferComposerViewState,
  setDiffComments,
  hostConfig,
  queryClient,
  operationId,
  onStepStatus,
  onTargetConversationId,
}: {
  conversationId: ConversationId;
  currentBranch: string;
  cwd: GitCwd;
  worktreeCheckoutBranch: string;
  selectedLocalCheckoutBranch: string | null;
  intl: IntlShape;
  appServerManager: ThreadHandoffAppServerManager;
  defaultBranch: string | null;
  transferComposerViewState: (
    sourceConversationId: ConversationId,
    targetConversationId: ConversationId,
  ) => void;
  setDiffComments: (
    updater:
      | SharedObjectValue<"diff_comments">
      | ((
          prev: SharedObjectValue<"diff_comments"> | undefined,
        ) => SharedObjectValue<"diff_comments"> | undefined),
  ) => void;
  hostConfig: HostConfig;
  queryClient: ThreadHandoffQueryClient;
  operationId: string;
  onStepStatus?: (
    stepId:
      | "create-new-worktree"
      | "reuse-existing-worktree"
      | "switching-thread",
    status: "running" | "done" | "failed",
  ) => void;
  onTargetConversationId?: (conversationId: ConversationId) => void;
}): Promise<MoveToWorktreeMutationResult> {
  const trimmedWorktreeCheckoutBranch = worktreeCheckoutBranch.trim();
  if (trimmedWorktreeCheckoutBranch.length === 0) {
    return {
      status: "error",
      message: intl.formatMessage({
        id: "localConversation.moveToWorktree.error.branchRequired",
        defaultMessage: "Worktree branch name is required",
        description:
          "Error shown when move-to-worktree is attempted without a target worktree branch name",
      }),
      execOutput: null,
    };
  }

  let worktreeGitRoot: GitRoot | null = null;
  let worktreeWorkspaceRoot: GitCwd | null = null;
  let createdWorktree = false;
  let targetHasUncommittedChanges = false;
  let createStepId: "create-new-worktree" | "reuse-existing-worktree" =
    "create-new-worktree";

  try {
    const resolvedWorktree = await workerRpcClient("git").request({
      method: "resolve-worktree-for-thread",
      params: {
        cwd,
        conversationId,
        hostConfig,
      },
    });
    worktreeGitRoot = resolvedWorktree.worktreeGitRoot;
    worktreeWorkspaceRoot = resolvedWorktree.worktreeWorkspaceRoot;
    targetHasUncommittedChanges = resolvedWorktree.hasUncommittedChanges;
  } catch (_error) {
    logger.warning(
      "Failed to resolve an existing worktree for thread. Falling back to creating a new worktree.",
    );
  }

  if (worktreeGitRoot != null && worktreeWorkspaceRoot != null) {
    createStepId = "reuse-existing-worktree";
    onStepStatus?.(createStepId, "running");
    onStepStatus?.(createStepId, "done");
  } else {
    onStepStatus?.(createStepId, "running");
    try {
      const createWorktreeResult = await fetchFromVSCode(
        "worktree-create-managed",
        {
          params: {
            hostId: hostConfig.id,
            cwd,
            startingState: {
              type: "branch",
              branchName: currentBranch,
            },
            localEnvironmentConfigPath: null,
            streamId: uuidv4(),
          },
        },
      );
      worktreeGitRoot = createWorktreeResult.worktreeGitRoot;
      worktreeWorkspaceRoot = createWorktreeResult.worktreeWorkspaceRoot;
      createdWorktree = true;
      targetHasUncommittedChanges = false;
      onStepStatus?.(createStepId, "done");
      void queryClient.invalidateQueries({
        queryKey: codexWorktreesQueryKey(getHostKey(hostConfig)),
      });
    } catch (error) {
      onStepStatus?.(createStepId, "failed");
      return {
        status: "error",
        message: intl.formatMessage(
          {
            id: "localConversation.moveToWorktree.error.createWorktree",
            defaultMessage: "Failed to create worktree: {message}",
            description:
              "Error shown when Move to worktree fails to create a worktree",
          },
          { message: maybeErrorToString(error) },
        ),
        execOutput: null,
      };
    }
  }
  if (worktreeGitRoot == null || worktreeWorkspaceRoot == null) {
    return {
      status: "error",
      message: intl.formatMessage({
        id: "localConversation.moveToWorktree.error.unknown",
        defaultMessage: "Failed to move to worktree. Please retry.",
        description: "Fallback error shown when move-to-worktree fails",
      }),
      execOutput: null,
    };
  }

  const createBranchResult = await fetchFromVSCode("git-create-branch", {
    params: {
      cwd: worktreeWorkspaceRoot,
      branch: trimmedWorktreeCheckoutBranch,
      hostId: hostConfig.id,
      mode: "worktree",
    },
  });
  if (createBranchResult.status === "error") {
    if (createdWorktree) {
      try {
        await fetchFromVSCode("worktree-delete", {
          params: {
            hostId: hostConfig.id,
            worktree: worktreeGitRoot,
            reason: "new-branch-cleanup",
          },
        });
      } catch (error) {
        logger.warning("Failed to clean up the newly created worktree: {}", {
          sensitive: { error: maybeErrorToString(error) },
          safe: {},
        });
      } finally {
        void queryClient.invalidateQueries({
          queryKey: codexWorktreesQueryKey(getHostKey(hostConfig)),
        });
      }
    }
    return {
      status: "error",
      message: intl.formatMessage(
        {
          id: "localConversation.moveToWorktree.error.prepareBranch",
          defaultMessage:
            "Failed to prepare worktree branch “{branch}”: {message}",
          description:
            "Error shown when move-to-worktree cannot create or resolve the target worktree branch",
        },
        {
          branch: trimmedWorktreeCheckoutBranch,
          message: createBranchResult.error,
        },
      ),
      execOutput: createBranchResult.execOutput,
    };
  }

  const moveResult = await workerRpcClient("git").request({
    method: "move-thread-to-worktree",
    params: {
      operationId,
      hostConfig,
      localCwd: cwd,
      sourceBranch: currentBranch,
      defaultBranch,
      localCheckoutBranch: selectedLocalCheckoutBranch,
      worktreeCheckoutBranch: trimmedWorktreeCheckoutBranch,
      worktreeGitRoot,
      worktreeWorkspaceRoot,
      stashTargetWorktree: targetHasUncommittedChanges,
      createdWorktree,
    },
  });
  if (moveResult.status === "error") {
    const rollbackIssues =
      moveResult.rollbackErrors.length > 0
        ? intl.formatMessage(
            {
              id: "localConversation.moveToWorktree.error.rollbackIssues",
              defaultMessage: " Rollback issues: {issues}",
              description:
                "Suffix appended to move-to-worktree error message when rollback has issues",
            },
            { issues: moveResult.rollbackErrors.join(", ") },
          )
        : "";
    return {
      status: "error",
      message: intl.formatMessage(
        {
          id: "localConversation.moveToWorktree.error.move",
          defaultMessage: "Failed to move to worktree: {message}",
          description:
            "Error shown when Move to worktree git operations fail in the worker",
        },
        { message: `${moveResult.message}${rollbackIssues}` },
      ),
      execOutput: moveResult.execOutput,
    };
  }

  onStepStatus?.("switching-thread", "running");

  let forkedConversationId: ConversationId;
  try {
    forkedConversationId = await appServerManager.forkConversationFromLatest({
      sourceConversationId: conversationId,
      cwd: worktreeWorkspaceRoot,
      workspaceRoots: [worktreeWorkspaceRoot],
      addForkedSyntheticItem: false,
    });
  } catch (error) {
    try {
      await fetchFromVSCode("worktree-set-owner-thread", {
        params: {
          hostId: hostConfig.id,
          worktree: worktreeGitRoot,
          conversationId,
        },
      });
    } catch {
      // Best-effort metadata repair; warning below is enough for recovery.
    }
    logger.warning(
      "Move to worktree git operations succeeded, but conversation fork failed: {}",
      {
        sensitive: { error: maybeErrorToString(error) },
        safe: {},
      },
    );
    onStepStatus?.("switching-thread", "failed");
    return {
      status: "success",
      conversationId,
    };
  }

  onTargetConversationId?.(forkedConversationId);

  try {
    await fetchFromVSCode("worktree-set-owner-thread", {
      params: {
        hostId: hostConfig.id,
        worktree: worktreeGitRoot,
        conversationId: forkedConversationId,
      },
    });
  } catch (error) {
    logger.warning(
      "Move to worktree succeeded, but worktree ownership metadata could not be updated: {}",
      {
        sensitive: { error: maybeErrorToString(error) },
        safe: {},
      },
    );
  }

  try {
    transferComposerViewState(conversationId, forkedConversationId);
  } catch (error) {
    logger.warning(
      "Move to worktree succeeded, but composer state could not be transferred: {}",
      {
        sensitive: { error: maybeErrorToString(error) },
        safe: {},
      },
    );
  }

  try {
    await transferThreadTitle({
      sourceConversationId: conversationId,
      targetConversationId: forkedConversationId,
      getTitle: (sourceConversationId) => {
        return (
          appServerManager.getConversation(sourceConversationId)?.title ?? null
        );
      },
      setTitle: (targetConversationId, title) => {
        return appServerManager.setThreadTitle(targetConversationId, title);
      },
    });
  } catch (error) {
    logger.warning(
      "Move to worktree succeeded, but thread title could not be transferred: {}",
      {
        sensitive: { error: maybeErrorToString(error) },
        safe: {},
      },
    );
  }

  try {
    setDiffComments((diffComments) =>
      getTransferredDiffCommentsState({
        sourceConversationId: conversationId,
        targetConversationId: forkedConversationId,
        diffComments,
      }),
    );
  } catch (error) {
    logger.warning(
      "Move to worktree succeeded, but saved diff comments could not be transferred: {}",
      {
        sensitive: { error: maybeErrorToString(error) },
        safe: {},
      },
    );
  }

  if (moveResult.warnings.includes("stashed-target-worktree-changes")) {
    logger.warning(
      "Move to worktree stashed uncommitted changes in the reused worktree",
    );
  }
  if (moveResult.warnings.includes("drop-source-stash-failed")) {
    logger.warning(
      "Move to worktree succeeded, but source stash cleanup failed",
    );
  }
  if (moveResult.warnings.includes("drop-target-stash-failed")) {
    logger.warning(
      "Move to worktree succeeded, but target stash cleanup failed",
    );
  }

  try {
    await transferThreadPin({
      sourceConversationId: conversationId,
      targetConversationId: forkedConversationId,
    });
  } catch (error) {
    logger.warning(
      "Move to worktree succeeded, but pinned-thread state could not be transferred: {}",
      {
        sensitive: { error: maybeErrorToString(error) },
        safe: {},
      },
    );
  }

  onStepStatus?.("switching-thread", "done");

  void appServerManager
    .archiveConversation(conversationId, { cleanupWorktree: false })
    .catch((error) => {
      logger.warning(
        "Move to worktree succeeded, but source thread archive failed: {}",
        {
          sensitive: { error: maybeErrorToString(error) },
          safe: {},
        },
      );
    });

  return {
    status: "success",
    conversationId: forkedConversationId,
  };
}
