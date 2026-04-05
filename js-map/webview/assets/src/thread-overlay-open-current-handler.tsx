import { useActiveConversationId } from "./hooks/use-active-conversation-id";
import { useThreadOverlayAction } from "./local-conversation/use-open-thread-overlay";
import { useMessage } from "./message-bus";

export function ThreadOverlayOpenCurrentHandler(): null {
  const localConversationId = useActiveConversationId();
  const { canOpenThreadOverlay } = useThreadOverlayAction({
    conversationId: localConversationId,
  });

  useMessage(
    "thread-overlay-open-current",
    (_message, dispatch) => {
      if (!localConversationId || !canOpenThreadOverlay) {
        return;
      }

      dispatch("open-thread-overlay", {
        conversationId: localConversationId,
      });
    },
    [canOpenThreadOverlay, localConversationId],
  );

  return null;
}
