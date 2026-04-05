import type * as AppServer from "app-server-types";
import { castDraft } from "immer";
import type { ConversationId } from "protocol";

import type { AppServerManager } from "../app-server-manager";
import type { AppServerConversationState } from "../app-server-manager-types";
import { registerAgentNicknameFromThread } from "../utils/collab-agent-tool-call-item";
import { mapThreadReadResponseToConversationTurns } from "../utils/map-resume-or-fork-conversation-response-to-turns";

export function applyRollbackResponseToConversation(
  manager: AppServerManager,
  {
    conversationId,
    conversationState,
    rollbackResponse,
  }: {
    conversationId: ConversationId;
    conversationState: AppServerConversationState;
    rollbackResponse: AppServer.v2.ThreadRollbackResponse;
  },
): void {
  const turns = mapThreadReadResponseToConversationTurns(rollbackResponse, {
    workspaceRoots: conversationState.cwd ? [conversationState.cwd] : [],
    fallbackCwd: conversationState.cwd ?? null,
    model: conversationState.latestModel,
    reasoningEffort: conversationState.latestReasoningEffort,
  });
  registerAgentNicknameFromThread(rollbackResponse.thread);

  manager.updateConversationState(conversationId, (draft) => {
    draft.turns = turns.map(castDraft);
    draft.requests = [];
    draft.resumeState = "resumed";
    draft.rolloutPath = rollbackResponse.thread.path ?? draft.rolloutPath;
    draft.cwd = rollbackResponse.thread.cwd || draft.cwd;
    draft.source = rollbackResponse.thread.source;
    draft.gitInfo = rollbackResponse.thread.gitInfo;
    draft.threadRuntimeStatus = rollbackResponse.thread.status;
    draft.hasUnreadTurn = false;
    const updatedAtMs = Number(rollbackResponse.thread.updatedAt) * 1000;
    if (Number.isFinite(updatedAtMs)) {
      draft.updatedAt = updatedAtMs;
    }
  });
}
