import type * as AppServer from "app-server-types";
import findLast from "lodash/findLast";
import type { ConversationId } from "protocol";

import { messageBus } from "@/message-bus";
import { logger } from "@/utils/logger";
import { fetchFromVSCode } from "@/vscode-api";

import type { AppServerConversationState } from "../app-server-manager-types";
import { getSubagentSourceMetadata } from "../utils/get-subagent-source-metadata";
import { getSubagentDescendantConversationIds } from "../utils/subagent-conversation-ids";

export type ArchiveConversationOptions = {
  cleanupWorktree?: boolean;
};

export type ArchiveConversationContext = {
  hostId: string;
  conversations: Map<ConversationId, AppServerConversationState>;
  threadsById: Map<string, AppServer.v2.Thread>;
  archivingConversationIds: Set<ConversationId>;
  isConversationSuppressedAfterArchive: (
    conversationId: ConversationId,
  ) => boolean;
  addSuppressedArchivedConversationId: (conversationId: ConversationId) => void;
  deleteSuppressedArchivedConversationId: (
    conversationId: ConversationId,
  ) => void;
  archiveThread: (conversationId: ConversationId) => Promise<void>;
  unarchiveThread: (conversationId: ConversationId) => Promise<void>;
  removeConversationFromCache: (conversationId: ConversationId) => void;
  interruptConversationSelf: (conversationId: ConversationId) => Promise<void>;
};

export function getArchiveCwd(
  conversation: AppServerConversationState | null | undefined,
): string {
  return (
    conversation?.cwd ??
    findLast(conversation?.turns ?? [], (turn) => Boolean(turn.params.cwd))
      ?.params.cwd ??
    "/"
  );
}

export function getArchiveCleanupWorktree(
  conversation: AppServerConversationState | null | undefined,
  options: ArchiveConversationOptions = {},
): boolean {
  return (
    options.cleanupWorktree !== false &&
    (conversation == null ||
      getSubagentSourceMetadata(conversation.source) == null)
  );
}

export async function archiveConversation(
  context: ArchiveConversationContext,
  conversationId: ConversationId,
  options: ArchiveConversationOptions = {},
): Promise<void> {
  const conversation = context.conversations.get(conversationId);
  if (!conversation) {
    logger.warning("Cannot delete conversation that doesn't exist");
    return;
  }
  await archiveSubagentDescendants(context, conversationId);
  await performArchiveConversation(
    context,
    conversationId,
    getArchiveCwd(conversation),
    {
      cleanupWorktree: getArchiveCleanupWorktree(conversation, options),
    },
  );
}

export async function unarchiveConversation(
  context: ArchiveConversationContext,
  conversationId: ConversationId,
): Promise<void> {
  messageBus.dispatchMessage("unarchive-thread", {
    hostId: context.hostId,
    conversationId,
  });
  logger.info("Unarchive requested", {
    safe: { conversationId },
    sensitive: {},
  });
  try {
    await context.unarchiveThread(conversationId);
    logger.info("Unarchive succeeded", {
      safe: { conversationId },
      sensitive: {},
    });
  } catch (error) {
    logger.error("Unarchive failed", {
      safe: { conversationId },
      sensitive: {
        conversationId,
        error,
      },
    });
    throw error;
  }
  messageBus.dispatchMessage("thread-unarchived", {
    hostId: context.hostId,
    conversationId,
  });
}

export async function performArchiveConversation(
  context: ArchiveConversationContext,
  conversationId: ConversationId,
  archiveCwd: string,
  options: ArchiveConversationOptions = {},
): Promise<void> {
  const wasSuppressed =
    context.isConversationSuppressedAfterArchive(conversationId);
  context.addSuppressedArchivedConversationId(conversationId);
  context.archivingConversationIds.add(conversationId);
  messageBus.dispatchMessage("archive-thread", {
    hostId: context.hostId,
    conversationId,
    cwd: archiveCwd,
    cleanupWorktree: options.cleanupWorktree !== false,
  });
  try {
    await context.archiveThread(conversationId);
    try {
      await fetchFromVSCode("set-thread-pinned", {
        params: {
          threadId: conversationId,
          pinned: false,
        },
      });
    } catch {
      // Best-effort cleanup; favorites are not supported in every host.
      void 0;
    }
    context.removeConversationFromCache(conversationId);
    messageBus.dispatchMessage("thread-archived", {
      hostId: context.hostId,
      conversationId,
      cwd: archiveCwd,
    });
  } catch (error) {
    if (!wasSuppressed) {
      context.deleteSuppressedArchivedConversationId(conversationId);
    }
    throw error;
  } finally {
    context.archivingConversationIds.delete(conversationId);
  }
}

export async function interruptSubagentDescendants(
  context: ArchiveConversationContext,
  conversationId: ConversationId,
): Promise<void> {
  const descendantIds = getSubagentDescendantConversationIds({
    conversationId,
    conversations: context.conversations,
    threadsById: context.threadsById,
  });
  await Promise.all(
    descendantIds.map(async (childConversationId) => {
      try {
        await context.interruptConversationSelf(childConversationId);
      } catch (error) {
        logger.warning("Failed to interrupt subagent descendant", {
          safe: {
            conversationId,
            childConversationId,
          },
          sensitive: { error },
        });
      }
    }),
  );
}

export async function archiveSubagentDescendants(
  context: ArchiveConversationContext,
  conversationId: ConversationId,
): Promise<void> {
  const descendantIds = getSubagentDescendantConversationIds({
    conversationId,
    conversations: context.conversations,
    threadsById: context.threadsById,
  });
  await Promise.all(
    descendantIds.map(async (childConversationId) => {
      const childConversation = context.conversations.get(childConversationId);
      if (!childConversation) {
        return;
      }
      try {
        await performArchiveConversation(
          context,
          childConversationId,
          getArchiveCwd(childConversation),
          { cleanupWorktree: false },
        );
      } catch (error) {
        logger.warning("Failed to archive subagent descendant", {
          safe: {
            conversationId,
            childConversationId,
          },
          sensitive: { error },
        });
      }
    }),
  );
}
