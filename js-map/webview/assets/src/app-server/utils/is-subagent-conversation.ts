import type { AppServerConversationState } from "../app-server-manager-types";
import { getSubagentSourceMetadata } from "./get-subagent-source-metadata";

export function isSubagentConversation(
  conversation: AppServerConversationState | null | undefined,
): boolean {
  return (
    getSubagentSourceMetadata(conversation?.source)?.parentThreadId != null
  );
}

export function shouldHideSubagentConversation(
  conversation: AppServerConversationState | null | undefined,
  isBackgroundSubagentsEnabled: boolean,
): boolean {
  return !isBackgroundSubagentsEnabled && isSubagentConversation(conversation);
}
