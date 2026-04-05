import type {
  CodeTaskDetailsResponse,
  MessageOutputItem,
  OutputDiff,
  PriorConversation,
  TextMessageContent,
} from "protocol";

import type { AppServerConversationState } from "@/app-server/app-server-manager-types";
import { mapStateToLocalConversationItems } from "@/local-conversation/items/map-mcp-conversation-turn";

/** Builds a prior conversation payload from a local conversation. */
export function mapLocalConversationToPriorConversation(
  mcpConversation: AppServerConversationState,
): PriorConversation {
  const conversation: Array<MessageOutputItem> = [];
  let lastUnifiedDiff: string | null = null;
  for (const turn of mcpConversation.turns) {
    const { items } = mapStateToLocalConversationItems(
      turn,
      mcpConversation.requests,
    );
    for (const item of items) {
      if (item.type === "user-message") {
        conversation.push({
          role: "user",
          content: [{ content_type: "text", text: item.message }],
        });
      } else if (item.type === "assistant-message" && item.completed) {
        conversation.push({
          role: "assistant",
          content: [{ content_type: "text", text: item.content }],
        });
      } else if (item.type === "turn-diff") {
        // Track the most recent turn that produced a diff.
        lastUnifiedDiff = item.unifiedDiff;
      }
    }
  }
  const diff: OutputDiff | null =
    lastUnifiedDiff != null
      ? {
          type: "output_diff",
          diff: lastUnifiedDiff,
        }
      : null;

  return {
    conversation,
    diff,
  };
}

/** Builds a prior conversation payload from a cloud task. */
export function mapCloudTaskToPriorConversation(
  details: CodeTaskDetailsResponse,
): PriorConversation {
  const conversation: Array<MessageOutputItem> = [];
  const userTextParts: Array<TextMessageContent> = (
    details.current_user_turn?.input_items ?? []
  )
    .flatMap((i) => (i?.type === "message" ? (i.content ?? []) : []))
    .filter((c): c is TextMessageContent => c.content_type === "text");
  if (userTextParts.length > 0) {
    conversation.push({ role: "user", content: userTextParts });
  }
  const assistantTextParts: Array<TextMessageContent> = (
    details.current_assistant_turn?.output_items ?? []
  )
    .flatMap((i) => (i?.type === "message" ? (i.content ?? []) : []))
    .filter((c): c is TextMessageContent => c.content_type === "text");
  if (assistantTextParts.length > 0) {
    conversation.push({ role: "assistant", content: assistantTextParts });
  }
  const diff = details.current_diff_task_turn?.output_items?.find(
    (i): i is OutputDiff => i.type === "output_diff",
  );
  return {
    conversation,
    diff,
  };
}
