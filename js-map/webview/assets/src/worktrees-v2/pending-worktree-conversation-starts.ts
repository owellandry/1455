import type { ConversationId } from "protocol";
import { useSyncExternalStore } from "react";

type PendingWorktreeConversationStartStatus =
  | {
      state: "waiting";
    }
  | {
      state: "starting";
    }
  | {
      state: "failed";
    }
  | {
      state: "succeeded";
      conversationId: ConversationId;
    };

export type PendingWorktreeConversationStart = {
  pendingWorktreeId: string;
} & PendingWorktreeConversationStartStatus;

const listeners = new Set<() => void>();
const statusesByPendingWorktreeId = new Map<
  string,
  PendingWorktreeConversationStartStatus
>();
let snapshot: Array<PendingWorktreeConversationStart> = [];

export function usePendingWorktreeConversationStarts(): Array<PendingWorktreeConversationStart> {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function usePendingWorktreeConversationStartActions(): {
  addPendingWorktreeConversationStart: (pendingWorktreeId: string) => void;
  beginPendingWorktreeConversationStart: (pendingWorktreeId: string) => boolean;
  failPendingWorktreeConversationStart: (pendingWorktreeId: string) => void;
  succeedPendingWorktreeConversationStart: (
    pendingWorktreeId: string,
    conversationId: ConversationId,
  ) => void;
  retryPendingWorktreeConversationStart: (pendingWorktreeId: string) => void;
  removePendingWorktreeConversationStart: (pendingWorktreeId: string) => void;
} {
  const addPendingWorktreeConversationStart = (
    pendingWorktreeId: string,
  ): void => {
    statusesByPendingWorktreeId.set(pendingWorktreeId, { state: "waiting" });
    emitChange();
  };

  const beginPendingWorktreeConversationStart = (
    pendingWorktreeId: string,
  ): boolean => {
    if (
      statusesByPendingWorktreeId.get(pendingWorktreeId)?.state !== "waiting"
    ) {
      return false;
    }
    statusesByPendingWorktreeId.set(pendingWorktreeId, { state: "starting" });
    emitChange();
    return true;
  };

  const failPendingWorktreeConversationStart = (
    pendingWorktreeId: string,
  ): void => {
    if (!statusesByPendingWorktreeId.has(pendingWorktreeId)) {
      return;
    }
    statusesByPendingWorktreeId.set(pendingWorktreeId, { state: "failed" });
    emitChange();
  };

  const succeedPendingWorktreeConversationStart = (
    pendingWorktreeId: string,
    conversationId: ConversationId,
  ): void => {
    if (!statusesByPendingWorktreeId.has(pendingWorktreeId)) {
      return;
    }
    statusesByPendingWorktreeId.set(pendingWorktreeId, {
      state: "succeeded",
      conversationId,
    });
    emitChange();
  };

  const retryPendingWorktreeConversationStart = (
    pendingWorktreeId: string,
  ): void => {
    if (!statusesByPendingWorktreeId.has(pendingWorktreeId)) {
      return;
    }
    statusesByPendingWorktreeId.set(pendingWorktreeId, { state: "waiting" });
    emitChange();
  };

  const removePendingWorktreeConversationStart = (
    pendingWorktreeId: string,
  ): void => {
    if (!statusesByPendingWorktreeId.delete(pendingWorktreeId)) {
      return;
    }
    emitChange();
  };

  return {
    addPendingWorktreeConversationStart,
    beginPendingWorktreeConversationStart,
    failPendingWorktreeConversationStart,
    succeedPendingWorktreeConversationStart,
    retryPendingWorktreeConversationStart,
    removePendingWorktreeConversationStart,
  };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Array<PendingWorktreeConversationStart> {
  return snapshot;
}

function emitChange(): void {
  snapshot = Array.from(
    statusesByPendingWorktreeId,
    ([pendingWorktreeId, status]): PendingWorktreeConversationStart => ({
      pendingWorktreeId,
      ...status,
    }),
  );
  listeners.forEach((listener) => {
    listener();
  });
}
