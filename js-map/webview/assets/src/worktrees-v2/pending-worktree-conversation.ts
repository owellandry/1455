import type { ConversationId, HostConfig } from "protocol";
import { createGitRoot } from "protocol";

import type { AppServerManager } from "@/app-server/app-server-manager";
import { buildStartConversationParams } from "@/composer/build-start-conversation-params";
import { setThreadPinned } from "@/set-pinned-thread";
import { logger } from "@/utils/logger";
import { fetchFromVSCode } from "@/vscode-api";

import type { PendingWorktree } from "./pending-worktree-store";

export async function launchPendingWorktreeConversation({
  entry,
  mcpManager,
  workspaceRoot,
}: {
  entry: PendingWorktree;
  mcpManager: Pick<
    AppServerManager,
    "startConversation" | "forkConversationFromLatest"
  >;
  workspaceRoot: string;
}): Promise<ConversationId> {
  if (entry.launchMode === "fork-conversation") {
    return mcpManager.forkConversationFromLatest({
      sourceConversationId: entry.sourceConversationId,
      cwd: workspaceRoot,
      workspaceRoots: [workspaceRoot],
      collaborationMode: entry.sourceCollaborationMode,
    });
  }

  if (entry.launchMode !== "start-conversation") {
    throw new Error(`Unsupported launch mode: ${entry.launchMode}`);
  }

  return mcpManager.startConversation(
    buildStartConversationParams({
      ...entry.startConversationParamsInput,
      workspaceRoots: [workspaceRoot],
      cwd: workspaceRoot,
    }),
  );
}

export async function applyPendingWorktreeConversationMetadata({
  entry,
  conversationId,
  hostConfig,
  mcpManager,
}: {
  entry: PendingWorktree;
  conversationId: ConversationId;
  hostConfig: HostConfig;
  mcpManager: Pick<AppServerManager, "renameConversationTitle">;
}): Promise<void> {
  if (entry.worktreeGitRoot != null) {
    try {
      await fetchFromVSCode("worktree-set-owner-thread", {
        params: {
          hostId: hostConfig.id,
          worktree: createGitRoot(entry.worktreeGitRoot),
          conversationId,
        },
      });
    } catch (error) {
      logger.warning(
        "Worktree created and conversation started, but failed to set worktree owner metadata: {}",
        {
          safe: {},
          sensitive: { error },
        },
      );
    }
  }

  if (entry.isPinned) {
    await setThreadPinned(conversationId, true);
  }

  const title = entry.label.trim();
  if (!entry.labelEdited || title.length === 0) {
    return;
  }
  await mcpManager.renameConversationTitle(conversationId, title);
}
