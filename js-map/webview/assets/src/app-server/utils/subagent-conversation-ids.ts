import type * as AppServer from "app-server-types";
import { createConversationId, type ConversationId } from "protocol";

import type { AppServerConversationState } from "../app-server-manager-types";
import { getSubagentSourceMetadata } from "./get-subagent-source-metadata";

export function getSubagentChildConversationIds(params: {
  conversationId: ConversationId;
  conversations: Map<ConversationId, AppServerConversationState>;
  threadsById: Map<string, AppServer.v2.Thread>;
}): Array<ConversationId> {
  const childIds = new Set<ConversationId>();
  const conversation = params.conversations.get(params.conversationId);
  if (conversation != null) {
    for (const turn of conversation.turns) {
      for (const item of turn.items ?? []) {
        if (item.type !== "collabAgentToolCall") {
          continue;
        }
        for (const receiverThreadId of item.receiverThreadIds) {
          const childConversationId = createConversationId(receiverThreadId);
          childIds.add(childConversationId);
        }
      }
    }
  }
  for (const [childConversationId, childConversation] of params.conversations) {
    if (
      getSubagentSourceMetadata(childConversation.source)?.parentThreadId ===
      params.conversationId
    ) {
      childIds.add(childConversationId);
    }
  }
  for (const [threadId, thread] of params.threadsById) {
    if (
      getSubagentSourceMetadata(thread.source)?.parentThreadId ===
      params.conversationId
    ) {
      childIds.add(createConversationId(threadId));
    }
  }

  return Array.from(childIds);
}

export function getSubagentDescendantConversationIds(params: {
  conversationId: ConversationId;
  conversations: Map<ConversationId, AppServerConversationState>;
  threadsById: Map<string, AppServer.v2.Thread>;
}): Array<ConversationId> {
  const descendants: Array<ConversationId> = [];
  const visited = new Set<ConversationId>([params.conversationId]);
  const queue = [
    ...getSubagentChildConversationIds({
      conversationId: params.conversationId,
      conversations: params.conversations,
      threadsById: params.threadsById,
    }),
  ];
  while (queue.length > 0) {
    const childConversationId = queue.shift();
    if (childConversationId == null || visited.has(childConversationId)) {
      continue;
    }
    visited.add(childConversationId);
    descendants.push(childConversationId);
    for (const grandchildId of getSubagentChildConversationIds({
      conversationId: childConversationId,
      conversations: params.conversations,
      threadsById: params.threadsById,
    })) {
      if (!visited.has(grandchildId)) {
        queue.push(grandchildId);
      }
    }
  }

  return descendants;
}
