import type * as AppServer from "app-server-types";
import type { ConversationId } from "protocol";

import { getLocalConversationTitle } from "@/local-conversation/get-local-conversation-title";

import type { AppServerManager } from "../app-server-manager";
import { addForkedFromConversationSyntheticItem } from "../synthetic-items";
import { isLocalConversationInProgress } from "../utils/is-local-conversation-in-progress";
import { applyRollbackResponseToConversation } from "./apply-rollback-response-to-conversation";

export type ForkConversationFromTurnParams = {
  sourceConversationId: ConversationId;
  targetTurnId: string;
  cwd?: string | null;
  workspaceRoots?: Array<string>;
  collaborationMode?: AppServer.CollaborationMode | null;
};

export async function forkConversationFromTurn(
  manager: AppServerManager,
  {
    sourceConversationId,
    targetTurnId,
    cwd,
    workspaceRoots,
    collaborationMode,
  }: ForkConversationFromTurnParams,
): Promise<ConversationId> {
  const sourceConversation = manager.getConversation(sourceConversationId);
  if (!sourceConversation) {
    throw new Error("Source conversation not found.");
  }
  if (isLocalConversationInProgress(sourceConversation)) {
    throw new Error("Cannot fork a conversation while it is in progress.");
  }

  const targetTurnIndex = sourceConversation.turns.findIndex(
    (turn) => turn.turnId === targetTurnId,
  );
  if (targetTurnIndex === -1) {
    throw new Error("Target turn not found.");
  }

  const numTurnsToDrop = sourceConversation.turns.length - targetTurnIndex;
  if (numTurnsToDrop < 1) {
    throw new Error("Target turn must not be after the latest turn.");
  }

  const forkedConversationId = await manager.forkConversationFromLatest({
    sourceConversationId,
    cwd,
    workspaceRoots,
    collaborationMode,
    addForkedSyntheticItem: false,
  });
  const forkedConversation = manager.getConversation(forkedConversationId);
  if (!forkedConversation) {
    throw new Error("Forked conversation state not found.");
  }

  const rollbackResponse = await manager.sendRequest("thread/rollback", {
    threadId: forkedConversationId as string,
    numTurns: numTurnsToDrop,
  });
  applyRollbackResponseToConversation(manager, {
    conversationId: forkedConversationId,
    conversationState: forkedConversation,
    rollbackResponse,
  });
  addForkedFromConversationSyntheticItem(
    manager,
    forkedConversationId,
    sourceConversationId,
    getLocalConversationTitle(sourceConversation),
  );

  return forkedConversationId;
}
