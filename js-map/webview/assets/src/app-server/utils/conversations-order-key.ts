import type { AppServerConversationState } from "../app-server-manager-types";

export function conversationsOrderKey(
  conversations: Array<AppServerConversationState>,
): string {
  return conversations
    .map(
      (conversation): string => `${conversation.id}:${conversation.updatedAt}`,
    )
    .join("|");
}
