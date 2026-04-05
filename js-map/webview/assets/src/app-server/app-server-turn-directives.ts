import type { ConversationId } from "protocol";

import {
  extractDirectives,
  stripDirectiveLines,
} from "@/directives/parse-directives";
import {
  APP_ACTION_ADD_INBOX_ITEM_DIRECTIVE_NAME,
  APP_ACTION_ARCHIVE_THREAD_DIRECTIVE_NAME,
} from "@/markdown-directives/codex-remark-directive";
import { messageBus } from "@/message-bus";
import { logger } from "@/utils/logger";
import { fetchFromVSCode } from "@/vscode-api";

import type { AppServerConversationState } from "./app-server-manager-types";
import {
  getArchiveCleanupWorktree,
  getArchiveCwd,
} from "./requests/archive-conversation";

type TurnDirectivesContext = {
  processedDirectiveTurnKeys: Set<string>;
  getConversation: (
    conversationId: ConversationId,
  ) => AppServerConversationState | undefined;
  performArchiveConversation: (
    conversationId: ConversationId,
    archiveCwd: string,
    options?: { cleanupWorktree?: boolean },
  ) => Promise<void>;
  refreshRecentConversations: () => Promise<void>;
};

export function handleTurnDirectives(
  context: TurnDirectivesContext,
  conversationId: ConversationId,
  turnId: string,
  markdown: string | null,
): void {
  if (!markdown || markdown.trim().length === 0) {
    logger.debug("[Directives] skipping empty turn", {
      safe: { turnId, conversationId },
      sensitive: {},
    });
    return;
  }
  const turnKey = `${conversationId}:${turnId}`;
  if (context.processedDirectiveTurnKeys.has(turnKey)) {
    logger.debug("[Directives] already processed turn", {
      safe: { turnId, conversationId },
      sensitive: {},
    });
    return;
  }
  context.processedDirectiveTurnKeys.add(turnKey);

  const directives = extractDirectives(markdown);
  const inboxDirectives = directives.filter((directive) => {
    return directive.name === APP_ACTION_ADD_INBOX_ITEM_DIRECTIVE_NAME;
  });
  const shouldArchive = directives.some((directive) => {
    return directive.name === APP_ACTION_ARCHIVE_THREAD_DIRECTIVE_NAME;
  });

  if (inboxDirectives.length === 0 && !shouldArchive) {
    return;
  }

  if (inboxDirectives.length > 0) {
    const seenIds = new Set<string>();
    const items = inboxDirectives.reduce<
      Array<{
        id: string;
        title: string | null;
        description: string | null;
      }>
    >((accumulator, directive, index) => {
      const attrs = directive.attributes;
      const explicitId = attrs.id?.trim() ?? null;
      const fallbackId =
        inboxDirectives.length > 1 && explicitId == null
          ? `${conversationId}-${index + 1}`
          : conversationId;
      const id = explicitId?.length ? explicitId : fallbackId;
      if (seenIds.has(id)) {
        return accumulator;
      }
      seenIds.add(id);
      accumulator.push({
        id,
        title: attrs.title ?? null,
        description:
          attrs.summary ?? attrs.description ?? attrs.subtitle ?? null,
      });
      return accumulator;
    }, []);

    if (items.length > 0) {
      logger.info("[Directives] creating inbox items", {
        safe: { itemCount: items.length, conversationId, turnId },
        sensitive: {},
      });
      messageBus.dispatchMessage("inbox-items-create", {
        conversationId,
        turnId,
        items,
      });
    }
  }

  if (!shouldArchive) {
    return;
  }

  logger.info("[Directives] archiving conversation", {
    safe: { conversationId, turnId },
    sensitive: {},
  });
  const archivedAssistantMessage = stripDirectiveLines(markdown);
  void fetchFromVSCode("automation-run-archive", {
    params: {
      threadId: conversationId,
      archivedAssistantMessage:
        archivedAssistantMessage.length > 0 ? archivedAssistantMessage : null,
      archivedUserMessage: null,
      archivedReason: "auto",
    },
  }).catch((error) => {
    logger.warning("Failed to persist archived automation message", {
      safe: {},
      sensitive: { error },
    });
  });

  const conversation = context.getConversation(conversationId);
  const archiveCwd = getArchiveCwd(conversation);
  void context
    .performArchiveConversation(conversationId, archiveCwd, {
      cleanupWorktree: getArchiveCleanupWorktree(conversation),
    })
    .catch(() => {
      void context.refreshRecentConversations().catch(() => {});
    });
}
