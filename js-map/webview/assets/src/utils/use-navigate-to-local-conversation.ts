import type { ThreadId } from "app-server-types";
import { createConversationId } from "protocol";
import { useCallback } from "react";
import { useNavigate } from "react-router";

import { initialRoute } from "@/initial-route-atom";
import { messageBus } from "@/message-bus";

export function useNavigateToLocalConversation(): (
  conversationId: ThreadId,
) => void {
  const navigate = useNavigate();

  return useCallback(
    (conversationId: ThreadId) => {
      const path = `/local/${createConversationId(conversationId)}`;
      if (initialRoute) {
        // If there was an initial route for this webview, we don't want to navigate to a new conversation here because this tab's initial route
        // will always be loaded when the window reloads. In this case, we want to navigate to a new editor tab instead.
        messageBus.dispatchMessage("navigate-in-new-editor-tab", {
          path,
        });
      } else {
        void navigate(path);
      }
    },
    [navigate],
  );
}
