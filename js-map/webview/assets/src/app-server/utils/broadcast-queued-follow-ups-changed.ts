import type { ConversationId, QueuedFollowUpMessage } from "protocol";

import { messageBus } from "@/message-bus";

export function broadcastQueuedFollowUpsChanged(
  conversationId: ConversationId,
  messages: Array<QueuedFollowUpMessage>,
): void {
  messageBus.dispatchMessage("thread-queued-followups-changed", {
    conversationId,
    messages,
  });
}
