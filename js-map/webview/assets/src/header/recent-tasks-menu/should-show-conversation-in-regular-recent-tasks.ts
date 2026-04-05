import type { AppServerConversationState } from "@/app-server/app-server-manager-types";
import {
  isSubagentConversation,
  shouldHideSubagentConversation,
} from "@/app-server/utils/is-subagent-conversation";
import type { WindowType } from "@/hooks/use-window-type";

export function shouldShowConversationInRegularRecentTasks({
  conversation,
  isBackgroundSubagentsEnabled,
  windowType,
}: {
  conversation: AppServerConversationState;
  isBackgroundSubagentsEnabled: boolean;
  windowType: WindowType;
}): boolean {
  if (windowType === "extension" && isSubagentConversation(conversation)) {
    return false;
  }

  return !shouldHideSubagentConversation(
    conversation,
    isBackgroundSubagentsEnabled,
  );
}
