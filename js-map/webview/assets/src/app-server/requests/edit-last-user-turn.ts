import type * as AppServer from "app-server-types";
import {
  buildPermissionsConfigForMode,
  type AgentMode,
  type ConversationId,
} from "protocol";

import { replacePromptRequest } from "@/prompts/render-prompt";
import { getDefaultServiceTierValue } from "@/utils/local-service-tier";

import type { AppServerManager } from "../app-server-manager";
import { OWNER_WINDOW_ERROR } from "../app-server-manager-constants";
import type { AppServerConversationTurn } from "../app-server-manager-types";
import { applyRollbackResponseToConversation } from "./apply-rollback-response-to-conversation";
import { startTurn } from "./start-turn";

export async function editLastUserTurn(
  manager: AppServerManager,
  {
    conversationId,
    turn,
    message,
    agentMode,
  }: {
    conversationId: ConversationId;
    turn: AppServerConversationTurn;
    message: string;
    agentMode: AgentMode;
  },
): Promise<void> {
  const role = manager.getStreamRole(conversationId);
  const followerEditResponse = await manager.sendThreadFollowerRequest(
    role,
    "thread-follower-edit-last-user-turn",
    {
      conversationId,
      turnId: turn.turnId,
      message,
      agentMode,
    },
  );
  if (followerEditResponse) {
    return;
  }

  if (role?.role !== "owner") {
    throw new Error(OWNER_WINDOW_ERROR);
  }

  const conversationState = manager.getConversation(conversationId);
  if (!conversationState) {
    throw new Error("Conversation state not found.");
  }

  const latestTurn = conversationState.turns.at(-1) ?? null;
  if (latestTurn?.turnId !== turn.turnId) {
    throw new Error("Only the most recent message can be edited.");
  }
  if (latestTurn.status === "inProgress") {
    throw new Error("Cannot edit a message while a turn is in progress.");
  }

  const rollbackResponse = await manager.sendRequest("thread/rollback", {
    threadId: conversationId as string,
    numTurns: 1,
  });
  applyRollbackResponseToConversation(manager, {
    conversationId,
    conversationState,
    rollbackResponse,
  });

  const cwd = rollbackResponse.thread.cwd || conversationState.cwd || undefined;
  const config = await manager.getUserSavedConfiguration(cwd);
  const permissions = buildPermissionsConfigForMode(
    agentMode,
    cwd != null ? [cwd] : [],
    config,
  );

  await startTurn(manager, conversationId, {
    input: buildEditedTextInput(turn.params.input, message),
    cwd,
    approvalPolicy: permissions.approvalPolicy,
    approvalsReviewer: permissions.approvalsReviewer,
    sandboxPolicy: permissions.sandboxPolicy,
    serviceTier: manager.getEffectiveServiceTier(getDefaultServiceTierValue()),
  });
}

function buildEditedTextInput(
  input: Array<AppServer.v2.UserInput>,
  message: string,
): Array<AppServer.v2.UserInput> {
  const originalPrompt = input
    .filter(
      (item): item is Extract<AppServer.v2.UserInput, { type: "text" }> =>
        item.type === "text",
    )
    .map((item) => item.text)
    .join("\n");
  const editedPrompt = replacePromptRequest(originalPrompt, message);
  const editedTextItem: Extract<AppServer.v2.UserInput, { type: "text" }> = {
    type: "text",
    text: editedPrompt,
    text_elements: [],
  };
  return [editedTextItem];
}
