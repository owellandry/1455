import { atom, useAtomValue } from "jotai";
import type { ConversationId } from "protocol";

import { tasksStore } from "@/tasks-store";

import type { PendingRequest } from "./pending-request";

const aPendingRequestByConversationId = atom<
  Record<ConversationId, PendingRequest | null>
>({});

export function setPendingRequestForConversation(
  conversationId: ConversationId,
  pendingRequest: PendingRequest | null,
): void {
  const previous = tasksStore.get(aPendingRequestByConversationId);
  if (pendingRequest == null) {
    if (!(conversationId in previous)) {
      return;
    }
    const next = { ...previous };
    delete next[conversationId];
    tasksStore.set(aPendingRequestByConversationId, next);
    return;
  }
  tasksStore.set(aPendingRequestByConversationId, {
    ...previous,
    [conversationId]: pendingRequest,
  });
}

export function removePendingRequestForConversation(
  conversationId: ConversationId,
): void {
  setPendingRequestForConversation(conversationId, null);
}

export function getPendingRequestForConversation(
  conversationId: ConversationId,
): PendingRequest | null {
  const pendingRequestsByConversationId = tasksStore.get(
    aPendingRequestByConversationId,
  );
  return pendingRequestsByConversationId[conversationId] ?? null;
}

export function usePendingRequest(
  conversationId: ConversationId | null,
): PendingRequest | null {
  const pendingRequestsByConversationId = useAtomValue(
    aPendingRequestByConversationId,
  );
  if (conversationId == null) {
    return null;
  }
  return pendingRequestsByConversationId[conversationId] ?? null;
}
