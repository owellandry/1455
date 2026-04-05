import type { ConversationId } from "protocol";

export async function transferThreadTitle({
  sourceConversationId,
  targetConversationId,
  getTitle,
  setTitle,
}: {
  sourceConversationId: ConversationId;
  targetConversationId: ConversationId;
  getTitle: (conversationId: ConversationId) => string | null;
  setTitle: (conversationId: ConversationId, title: string) => Promise<void>;
}): Promise<void> {
  if (sourceConversationId === targetConversationId) {
    return;
  }

  const title = getTitle(sourceConversationId);
  if (title == null) {
    return;
  }

  await setTitle(targetConversationId, title);
}
