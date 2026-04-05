import { createConversationId, type ConversationId } from "protocol";

import type { AppServerConversationState } from "../app-server-manager-types";
import { getSubagentSourceMetadata } from "./get-subagent-source-metadata";

export function getSubagentTitlePrompt(params: {
  conversationId: ConversationId;
  conversations: Map<ConversationId, AppServerConversationState>;
}): string {
  const conversation = params.conversations.get(params.conversationId);
  const parentThreadId =
    getSubagentSourceMetadata(conversation?.source)?.parentThreadId ?? null;
  if (parentThreadId == null) {
    return "";
  }

  const parentConversation = params.conversations.get(
    createConversationId(parentThreadId),
  );
  if (parentConversation == null) {
    return "";
  }

  for (
    let turnIndex = parentConversation.turns.length - 1;
    turnIndex >= 0;
    turnIndex -= 1
  ) {
    const turn = parentConversation.turns[turnIndex];
    for (const item of turn.items) {
      if (item.type !== "collabAgentToolCall") {
        continue;
      }
      if (!item.receiverThreadIds.includes(params.conversationId)) {
        continue;
      }

      return item.prompt?.trim() ?? "";
    }
  }

  return "";
}
