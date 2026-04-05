import type { ConversationId } from "protocol";

const startTurnLocks = new Set<ConversationId>();

export function tryAcquireStartTurnLock(
  conversationId: ConversationId,
): boolean {
  if (startTurnLocks.has(conversationId)) {
    return false;
  }
  startTurnLocks.add(conversationId);
  return true;
}

export function releaseStartTurnLock(conversationId: ConversationId): void {
  startTurnLocks.delete(conversationId);
}
