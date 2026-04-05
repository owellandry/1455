import { createConversationId, type ConversationId } from "protocol";
import { useMatch } from "react-router";

export function useActiveConversationId(): ConversationId | null {
  const localMatch = useMatch("/local/:conversationId");
  const remoteMatch = useMatch("/remote/:conversationId");
  const threadOverlayMatch = useMatch("/thread-overlay/:conversationId");
  const hotkeyWindowMatch = useMatch("/hotkey-window/thread/:conversationId");
  const conversationId =
    localMatch?.params.conversationId ??
    remoteMatch?.params.conversationId ??
    threadOverlayMatch?.params.conversationId ??
    hotkeyWindowMatch?.params.conversationId;

  return conversationId ? createConversationId(conversationId) : null;
}
