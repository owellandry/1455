import type * as AppServer from "app-server-types";
import { createConversationId, type ConversationId } from "protocol";

import { getLocalConversationTitle } from "@/local-conversation/get-local-conversation-title";
import { logger } from "@/utils/logger";

import type { AppServerManager } from "../app-server-manager";
import { addForkedFromConversationSyntheticItem } from "../synthetic-items";
import { maybeResumeConversation } from "./maybe-resume-conversation";

export type ForkConversationFromLatestParams = {
  sourceConversationId: ConversationId;
  cwd?: string | null;
  workspaceRoots?: Array<string>;
  collaborationMode?: AppServer.CollaborationMode | null;
  addForkedSyntheticItem?: boolean;
};

export async function forkConversationFromLatest(
  manager: AppServerManager,
  {
    sourceConversationId,
    cwd,
    workspaceRoots,
    collaborationMode,
    addForkedSyntheticItem = true,
  }: ForkConversationFromLatestParams,
): Promise<ConversationId> {
  const sourceConversation = manager.getConversation(sourceConversationId);
  if (!sourceConversation) {
    logger.error("Source conversation not found", {
      safe: { sourceConversationId },
      sensitive: {},
    });
  }

  const forkResponse = await manager.sendRequest("thread/fork", {
    threadId: sourceConversationId as string,
    path: null,
    cwd,
    persistExtendedHistory: false,
  });
  const conversationId = createConversationId(forkResponse.thread.id);
  const existingConversation = manager.getConversation(conversationId);
  if (existingConversation) {
    manager.updateConversationState(conversationId, (draft) => {
      draft.resumeState = "needs_resume";
    });
  }

  await maybeResumeConversation(manager, {
    conversationId,
    model: null,
    reasoningEffort: null,
    workspaceRoots: workspaceRoots?.length ? workspaceRoots : [cwd ?? "/"],
    collaborationMode: collaborationMode ?? null,
  });

  if (addForkedSyntheticItem) {
    addForkedFromConversationSyntheticItem(
      manager,
      conversationId,
      sourceConversationId,
      getLocalConversationTitle(sourceConversation),
    );
  }

  return conversationId;
}
