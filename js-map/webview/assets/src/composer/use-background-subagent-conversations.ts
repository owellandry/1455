import type { ConversationId } from "protocol";
import { useRef, useSyncExternalStore } from "react";

import type { AppServerManager } from "@/app-server/app-server-manager";
import type { AppServerConversationState } from "@/app-server/app-server-manager-types";

export function useBackgroundSubagentConversations(params: {
  manager: AppServerManager;
  childConversationIds: Array<ConversationId>;
}): Array<AppServerConversationState | null> {
  const { childConversationIds, manager } = params;
  const snapshotCacheRef = useRef<{
    key: string;
    value: Array<AppServerConversationState | null>;
  }>({
    key: "",
    value: [],
  });
  const childConversationKey = childConversationIds.join("\n");

  const getSnapshot = (): Array<AppServerConversationState | null> => {
    if (childConversationIds.length === 0) {
      if (
        snapshotCacheRef.current.key === childConversationKey &&
        snapshotCacheRef.current.value.length === 0
      ) {
        return snapshotCacheRef.current.value;
      }

      snapshotCacheRef.current = {
        key: childConversationKey,
        value: [],
      };
      return snapshotCacheRef.current.value;
    }

    const nextValue = childConversationIds.map((conversationId) =>
      manager.getConversation(conversationId),
    );
    const matchesCachedSnapshot =
      snapshotCacheRef.current.key === childConversationKey &&
      snapshotCacheRef.current.value.length === nextValue.length &&
      nextValue.every(
        (conversation, index) =>
          conversation === snapshotCacheRef.current.value[index],
      );

    if (matchesCachedSnapshot) {
      return snapshotCacheRef.current.value;
    }

    snapshotCacheRef.current = {
      key: childConversationKey,
      value: nextValue,
    };
    return snapshotCacheRef.current.value;
  };

  return useSyncExternalStore(
    (onStoreChange) => {
      if (childConversationIds.length === 0) {
        return () => {};
      }

      const unsubscribes = childConversationIds.map((conversationId) =>
        manager.addConversationCallback(conversationId, onStoreChange),
      );
      const unsubscribeAny = manager.addAnyConversationCallback(onStoreChange);
      return () => {
        unsubscribes.forEach((unsubscribe) => {
          unsubscribe();
        });
        unsubscribeAny();
      };
    },
    getSnapshot,
    getSnapshot,
  );
}
