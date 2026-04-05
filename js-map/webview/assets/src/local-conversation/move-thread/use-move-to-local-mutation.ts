import {
  createGitCwd,
  maybeErrorToString,
  type ConversationId,
  type CommandExecutionOutput,
  type GitCwd,
  type GitRoot,
  type HostConfig,
  type SharedObjectValue,
} from "protocol";
import type { IntlShape } from "react-intl";

import type { AppServerManager } from "@/app-server/app-server-manager";
import { logger } from "@/utils/logger";
import { fetchFromVSCode } from "@/vscode-api";
import { workerRpcClient } from "@/worker-rpc";

import { getTransferredDiffCommentsState } from "./transfer-thread-diff-comments";
import { transferThreadPin } from "./transfer-thread-pin";
import { transferThreadTitle } from "./transfer-thread-title";

export type MoveToLocalMutationResult =
  | {
      status: "success";
      conversationId: ConversationId;
    }
  | {
      status: "error";
      message: string;
      execOutput?: CommandExecutionOutput;
    };

type ThreadHandoffAppServerManager = {
  archiveConversation: AppServerManager["archiveConversation"];
  forkConversationFromLatest: AppServerManager["forkConversationFromLatest"];
  getConversation: AppServerManager["getConversation"];
  setThreadTitle: AppServerManager["setThreadTitle"];
};

export async function moveToLocal({
  conversationId,
  currentBranch,
  cwd,
  localGitRoot,
  localWorkspaceRoot,
  worktreeRoot,
  branchCheckedOutElsewhere,
  intl,
  appServerManager,
  transferComposerViewState,
  setDiffComments,
  hostConfig,
  operationId,
  onSwitchingThreadStart,
  onSwitchingThreadDone,
  onSwitchingThreadFailed,
  onTargetConversationId,
}: {
  conversationId: ConversationId;
  currentBranch: string;
  cwd: GitCwd;
  localGitRoot: GitRoot | null;
  localWorkspaceRoot: string | null;
  worktreeRoot: GitRoot | null;
  branchCheckedOutElsewhere: boolean;
  intl: IntlShape;
  appServerManager: ThreadHandoffAppServerManager;
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
  operationId: string;
  onSwitchingThreadStart?: () => void;
  onSwitchingThreadDone?: () => void;
  onSwitchingThreadFailed?: () => void;
  onTargetConversationId?: (conversationId: ConversationId) => void;
}): Promise<MoveToLocalMutationResult> {
  if (
    localGitRoot == null ||
    localWorkspaceRoot == null ||
    worktreeRoot == null ||
    branchCheckedOutElsewhere
  ) {
    return {
      status: "error",
      message: intl.formatMessage({
        id: "localConversation.moveToLocal.error.prerequisites",
        defaultMessage:
          "Unable to move right now. Check local workspace state and retry.",
        description:
          "Error shown when move-to-local cannot start due to missing prerequisites",
      }),
    };
  }
  const forkCwd = createGitCwd(localWorkspaceRoot);
  if (forkCwd == null) {
    return {
      status: "error",
      message: intl.formatMessage(
        {
          id: "localConversation.moveToLocal.error.fork",
          defaultMessage: "{message}",
          description: "Error shown when Move to local fails",
        },
        { message: "Invalid local workspace root" },
      ),
    };
  }

  const moveResult = await workerRpcClient("git").request({
    method: "move-thread-to-local",
    params: {
      operationId,
      hostConfig,
      sourceWorktreeCwd: cwd,
      sourceWorktreeRoot: worktreeRoot,
      localGitRoot,
      sourceBranch: currentBranch,
    },
  });
  if (moveResult.status === "error") {
    const rollbackIssues =
      moveResult.rollbackErrors.length > 0
        ? intl.formatMessage(
            {
              id: "localConversation.moveToLocal.error.rollbackIssues",
              defaultMessage: " Rollback issues: {issues}",
              description:
                "Suffix appended to move-to-local error message when rollback has issues",
            },
            { issues: moveResult.rollbackErrors.join(", ") },
          )
        : "";
    return {
      status: "error",
      message: intl.formatMessage(
        {
          id: "localConversation.moveToLocal.error.move",
          defaultMessage: "{message}",
          description:
            "Error shown when Move to local git operations fail in the worker",
        },
        { message: `${moveResult.message}${rollbackIssues}` },
      ),
      execOutput: moveResult.execOutput,
    };
  }
  if (moveResult.warnings.includes("drop-source-stash-failed")) {
    logger.warning("Move to local succeeded, but source stash cleanup failed");
  }

  onSwitchingThreadStart?.();

  let forkedConversationId: ConversationId;
  try {
    forkedConversationId = await appServerManager.forkConversationFromLatest({
      sourceConversationId: conversationId,
      cwd: forkCwd,
      workspaceRoots: [forkCwd],
      addForkedSyntheticItem: false,
    });
  } catch (error) {
    logger.warning(
      "Move to local git operations succeeded, but conversation fork failed: {}",
      {
        sensitive: { error: maybeErrorToString(error) },
        safe: {},
      },
    );
    onSwitchingThreadFailed?.();
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
        worktree: worktreeRoot,
        conversationId: forkedConversationId,
      },
    });
  } catch (error) {
    logger.warning(
      "Move to local succeeded, but worktree ownership metadata could not be updated: {}",
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
      "Move to local succeeded, but composer state could not be transferred: {}",
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
      "Move to local succeeded, but thread title could not be transferred: {}",
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
      "Move to local succeeded, but saved diff comments could not be transferred: {}",
      {
        sensitive: { error: maybeErrorToString(error) },
        safe: {},
      },
    );
  }

  try {
    await transferThreadPin({
      sourceConversationId: conversationId,
      targetConversationId: forkedConversationId,
    });
  } catch (error) {
    logger.warning(
      "Move to local succeeded, but pinned-thread state could not be transferred: {}",
      {
        sensitive: { error: maybeErrorToString(error) },
        safe: {},
      },
    );
  }

  onSwitchingThreadDone?.();

  void appServerManager
    .archiveConversation(conversationId, { cleanupWorktree: false })
    .catch((error) => {
      logger.warning(
        "Move to local succeeded, but source worktree thread archive failed: {}",
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
