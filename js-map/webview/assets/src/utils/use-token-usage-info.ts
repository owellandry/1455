import type * as AppServer from "app-server-types";
import type { ConversationId } from "protocol";
import { useCallback, useSyncExternalStore } from "react";

import { useAppServerManagerForConversationId } from "@/app-server/app-server-manager-hooks";

export const useTokenUsageInfo = (
  conversationId: ConversationId | null,
): AppServer.v2.ThreadTokenUsage | null => {
  const mcpManager = useAppServerManagerForConversationId(conversationId);
  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      if (!conversationId) {
        return () => {};
      }
      mcpManager.addConversationCallback(conversationId, onStoreChange);
      return () =>
        mcpManager.removeConversationCallback(conversationId, onStoreChange);
    },
    [mcpManager, conversationId],
  );
  return useSyncExternalStore(
    subscribe,
    () => {
      if (!conversationId) {
        return null;
      }
      const conversation = mcpManager.getConversation(conversationId);
      if (!conversation || conversation.resumeState !== "resumed") {
        return null;
      }
      return conversation.latestTokenUsageInfo ?? null;
    },
    () => null,
  );
};
