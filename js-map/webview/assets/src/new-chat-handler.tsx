import { useStartNewConversation } from "@/hooks/use-start-new-conversation";
import { useMessage } from "@/message-bus";

export function NewChatHandler(): null {
  const startNewChat = useStartNewConversation();
  useMessage("new-chat", () => startNewChat(), [startNewChat]);
  return null;
}
