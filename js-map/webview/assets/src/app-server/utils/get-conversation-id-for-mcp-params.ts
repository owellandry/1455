export function getConversationIdForMcpParams(params: unknown): string | null {
  if (!params || typeof params !== "object") {
    return null;
  }
  const threadId = (params as { threadId?: unknown }).threadId;
  if (typeof threadId === "string") {
    return threadId;
  }
  const thread = (params as { thread?: unknown }).thread;
  if (thread && typeof thread === "object") {
    const nestedThreadId = (thread as { id?: unknown }).id;
    if (typeof nestedThreadId === "string") {
      return nestedThreadId;
    }
  }
  const conversationId = (params as { conversationId?: unknown })
    .conversationId;
  if (typeof conversationId === "string") {
    return conversationId;
  }
  return null;
}
