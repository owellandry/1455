import type * as AppServer from "app-server-types";
import type { ConversationId } from "protocol";

import type {
  AppServerConversationState,
  AppServerConversationTurn,
} from "../app-server-manager-types";
import { getThreadConversationTimestamps } from "./get-thread-conversation-timestamps";

export function createConversationStateFromThread({
  thread,
  hostId,
  conversationId,
  turns,
  cachedTitle,
  resumeState,
  latestCollaborationMode,
}: {
  thread: AppServer.v2.Thread;
  hostId: string;
  conversationId: ConversationId;
  turns: Array<AppServerConversationTurn>;
  cachedTitle: string | null;
  resumeState: AppServerConversationState["resumeState"];
  latestCollaborationMode: AppServer.CollaborationMode;
}): AppServerConversationState {
  const { createdAt, updatedAt } = getThreadConversationTimestamps(thread);
  return {
    id: conversationId,
    hostId,
    turns,
    pendingSteers: [],
    requests: [],
    createdAt,
    updatedAt,
    title: cachedTitle,
    source: thread.source,
    latestModel: "",
    latestReasoningEffort: null,
    previousTurnModel: null,
    latestCollaborationMode,
    hasUnreadTurn: false,
    rolloutPath: thread.path ?? "",
    gitInfo: thread.gitInfo,
    resumeState,
    latestTokenUsageInfo: null,
    cwd: thread.cwd,
  };
}
