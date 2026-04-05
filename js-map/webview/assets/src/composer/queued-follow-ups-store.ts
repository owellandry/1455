import { useQueryClient } from "@tanstack/react-query";
import keyBy from "lodash/keyBy";
import uniq from "lodash/uniq";
import {
  GlobalStateKey,
  type ConversationId,
  type QueuedFollowUpMessage,
  type QueuedFollowUpState,
} from "protocol";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { v4 as uuidv4 } from "uuid";

import { useAppServerManagerForConversationId } from "@/app-server/app-server-manager-hooks";
import { INTERRUPTED_PENDING_STEER_PAUSED_REASON } from "@/app-server/pending-steer";
import { useGlobalState } from "@/hooks/use-global-state";
import { registerIpcBroadcastHandler } from "@/ipc-broadcast";
import { ipcRequest } from "@/ipc-request";
import { messageBus } from "@/message-bus";
import { logger } from "@/utils/logger";
import { getQueryKey } from "@/vscode-api";

type QueuedFollowUpActions = {
  enqueue: (message: {
    text: string;
    context: QueuedFollowUpMessage["context"];
    cwd: string;
  }) => QueuedFollowUpMessage | null;
  requeue: (message: QueuedFollowUpMessage) => void;
  dequeue: (messageId: string) => QueuedFollowUpMessage | null;
  remove: (messageId: string) => void;
  update: (
    messageId: string,
    updater: (prev: QueuedFollowUpMessage) => QueuedFollowUpMessage,
  ) => void;
  resumeInterruptedSteers: () => void;
  reorder: (orderedMessageIds: Array<string>) => void;
};

export function useQueuedFollowUps(conversationId: ConversationId | null): {
  messages: Array<QueuedFollowUpMessage>;
  actions: QueuedFollowUpActions;
  isLoading: boolean;
} {
  const mcpManager = useAppServerManagerForConversationId(conversationId);
  const { data, setData, isLoading } = useGlobalState(
    GlobalStateKey.QUEUED_FOLLOW_UPS,
  );
  const queryClient = useQueryClient();
  const queryKey = getQueryKey("get-global-state", {
    key: GlobalStateKey.QUEUED_FOLLOW_UPS,
  });
  const stateRef = useRef<QueuedFollowUpState>({});
  const pendingUpdatesRef = useRef<
    Array<(prev: QueuedFollowUpState) => QueuedFollowUpState>
  >([]);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (isLoading) {
      if (data != null) {
        stateRef.current = data ?? {};
      }
      return;
    }
    hasLoadedRef.current = true;
    stateRef.current = data ?? {};
    if (pendingUpdatesRef.current.length === 0) {
      return;
    }
    const merged = pendingUpdatesRef.current.reduce(
      (acc, updater) => updater(acc),
      stateRef.current,
    );
    pendingUpdatesRef.current = [];
    stateRef.current = merged;
    void setData(merged);
  }, [data, isLoading, setData]);

  const messages = useMemo((): Array<QueuedFollowUpMessage> => {
    if (!conversationId) {
      return [];
    }
    const state = isLoading ? stateRef.current : (data ?? stateRef.current);
    return state[conversationId] ?? [];
  }, [conversationId, data, isLoading]);

  const updateState = useCallback(
    (updater: (prev: QueuedFollowUpState) => QueuedFollowUpState): void => {
      const next = updater(stateRef.current ?? {});
      stateRef.current = next;
      if (!hasLoadedRef.current) {
        pendingUpdatesRef.current = [...pendingUpdatesRef.current, updater];
        return;
      }
      queryClient.setQueryData(queryKey, next);
      void setData(next);
    },
    [queryClient, queryKey, setData],
  );

  const replaceConversationQueueInState = useCallback(
    (nextQueue: Array<QueuedFollowUpMessage>): void => {
      if (!conversationId) {
        return;
      }
      updateState((prev) => {
        if (nextQueue.length === 0) {
          const { [conversationId]: _, ...next } = prev;
          return next;
        }
        return { ...prev, [conversationId]: nextQueue };
      });
    },
    [conversationId, updateState],
  );

  const setConversationQueueShadowState = useCallback(
    (nextQueue: Array<QueuedFollowUpMessage>): void => {
      if (!conversationId) {
        return;
      }
      const current = stateRef.current ?? {};
      if (nextQueue.length === 0) {
        const { [conversationId]: _, ...next } = current;
        stateRef.current = next;
        return;
      }
      stateRef.current = {
        ...current,
        [conversationId]: nextQueue,
      };
    },
    [conversationId],
  );

  const syncConversationQueue = useCallback(
    (
      nextQueue: Array<QueuedFollowUpMessage>,
      source: "local-action" | "ipc-broadcast",
    ): void => {
      if (!conversationId) {
        return;
      }
      const role = mcpManager.getStreamRole(conversationId);
      if (source === "local-action" && role?.role === "follower") {
        setConversationQueueShadowState(nextQueue);
        void ipcRequest(
          "thread-follower-set-queued-follow-ups-state",
          {
            conversationId,
            state: stateRef.current,
          },
          {
            targetClientId: role.ownerClientId,
          },
        ).then((response) => {
          if (response.resultType === "error") {
            logger.warning(
              "[queued-followups] Failed to sync queued messages",
              {
                safe: {},
                sensitive: {
                  conversationId,
                  error: response.error,
                },
              },
            );
          }
        });
        return;
      }

      replaceConversationQueueInState(nextQueue);

      if (source === "local-action" && role?.role === "owner") {
        messageBus.dispatchMessage("thread-queued-followups-changed", {
          conversationId,
          messages: nextQueue,
        });
      }
    },
    [
      conversationId,
      mcpManager,
      replaceConversationQueueInState,
      setConversationQueueShadowState,
    ],
  );

  useEffect(() => {
    if (!conversationId) {
      return;
    }
    return registerIpcBroadcastHandler(
      "thread-queued-followups-changed",
      (message): void => {
        if (message.params.conversationId !== conversationId) {
          return;
        }
        syncConversationQueue(message.params.messages, "ipc-broadcast");
      },
    );
  }, [conversationId, syncConversationQueue]);

  const enqueue = useCallback(
    (message: {
      text: string;
      context: QueuedFollowUpMessage["context"];
      cwd: string;
    }): QueuedFollowUpMessage | null => {
      if (!conversationId) {
        return null;
      }
      const nextMessage: QueuedFollowUpMessage = {
        id: uuidv4(),
        text: message.text,
        context: message.context,
        cwd: message.cwd,
        createdAt: Date.now(),
      };
      const queue = stateRef.current[conversationId] ?? [];
      syncConversationQueue([...queue, nextMessage], "local-action");
      return nextMessage;
    },
    [conversationId, syncConversationQueue],
  );

  const requeue = useCallback(
    (message: QueuedFollowUpMessage): void => {
      if (!conversationId) {
        return;
      }
      const queue = stateRef.current[conversationId] ?? [];
      syncConversationQueue([...queue, message], "local-action");
    },
    [conversationId, syncConversationQueue],
  );

  const remove = useCallback(
    (messageId: string): void => {
      if (!conversationId) {
        return;
      }
      const queue = stateRef.current[conversationId] ?? [];
      const nextQueue = queue.filter((item) => item.id !== messageId);
      syncConversationQueue(nextQueue, "local-action");
    },
    [conversationId, syncConversationQueue],
  );

  const dequeue = useCallback(
    (messageId: string): QueuedFollowUpMessage | null => {
      if (!conversationId) {
        return null;
      }
      const queue = stateRef.current[conversationId] ?? [];
      const removedMessage =
        queue.find((item) => item.id === messageId) ?? null;
      if (!removedMessage) {
        return null;
      }
      const nextQueue = queue.filter((item) => item.id !== messageId);
      syncConversationQueue(nextQueue, "local-action");
      return removedMessage;
    },
    [conversationId, syncConversationQueue],
  );

  const update = useCallback(
    (
      messageId: string,
      updater: (prev: QueuedFollowUpMessage) => QueuedFollowUpMessage,
    ): void => {
      if (!conversationId) {
        return;
      }
      const queue = stateRef.current[conversationId] ?? [];
      const nextQueue = queue.map((item) =>
        item.id === messageId ? updater(item) : item,
      );
      syncConversationQueue(nextQueue, "local-action");
    },
    [conversationId, syncConversationQueue],
  );

  const clearPausedReason = useCallback(
    (pausedReason: string): void => {
      if (!conversationId) {
        return;
      }
      const queue = stateRef.current[conversationId] ?? [];
      let changed = false;
      const nextQueue = queue.map((item) => {
        if (item.pausedReason !== pausedReason) {
          return item;
        }
        changed = true;
        const { pausedReason: _pausedReason, ...rest } = item;
        return rest;
      });
      if (!changed) {
        return;
      }
      syncConversationQueue(nextQueue, "local-action");
    },
    [conversationId, syncConversationQueue],
  );

  const reorder = (orderedMessageIds: Array<string>): void => {
    if (!conversationId) {
      return;
    }
    const queue = stateRef.current[conversationId] ?? [];
    if (queue.length <= 1) {
      return;
    }

    const queueById = keyBy(queue, "id");
    const reordered = uniq(orderedMessageIds)
      .map((messageId) => queueById[messageId])
      .filter((message): message is QueuedFollowUpMessage => message != null);
    const reorderedIds = new Set(reordered.map((message) => message.id));
    const nextQueue = [
      ...reordered,
      ...queue.filter((message) => !reorderedIds.has(message.id)),
    ];

    syncConversationQueue(nextQueue, "local-action");
  };

  return {
    messages,
    actions: {
      enqueue,
      requeue,
      dequeue,
      remove,
      update,
      resumeInterruptedSteers: (): void => {
        clearPausedReason(INTERRUPTED_PENDING_STEER_PAUSED_REASON);
      },
      reorder,
    },
    isLoading,
  };
}
