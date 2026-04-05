import type { ConversationId } from "protocol";

import { logger } from "@/utils/logger";

import type { AppServerManager } from "../app-server-manager";

export async function updateThreadGitBranch(
  manager: AppServerManager,
  conversationId: ConversationId,
  branch: string,
): Promise<boolean> {
  const nextBranch = branch.trim();
  if (nextBranch.length === 0) {
    return false;
  }

  try {
    // Do not short-circuit on in-memory gitInfo.branch here. Worktree
    // conversations can mirror the live branch into memory before the
    // persisted thread metadata has been updated.
    await manager.sendRequest("thread/metadata/update", {
      threadId: String(conversationId),
      gitInfo: {
        branch: nextBranch,
      },
    });
    manager.updateConversationState(conversationId, (draft) => {
      draft.gitInfo = {
        branch: nextBranch,
        sha: draft.gitInfo?.sha ?? null,
        originUrl: draft.gitInfo?.originUrl ?? null,
      };
    });
    return true;
  } catch (error) {
    logger.warning("Failed to update thread git branch metadata", {
      safe: {
        conversationId,
      },
      sensitive: {
        error,
      },
    });
    return false;
  }
}
