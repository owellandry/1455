import type * as AppServer from "app-server-types";
import type { WritableDraft } from "immer";
import { castDraft } from "immer";
import isEqual from "lodash/isEqual";
import type { ConversationId } from "protocol";

import { registerAgentNicknameForSessionId } from "@/local-conversation/items/multi-agent-mentions";

import type { AppServerConversationState } from "../app-server-manager-types";
import type {
  CollabAgentToolCallItem,
  CollabReceiverThread,
  Item,
} from "../item-schema";
import { getThreadAgentNickname } from "./get-thread-agent-nickname";

export function getCollabReceiverThreads(params: {
  receiverThreadIds: Array<string>;
  threadsById: Map<string, AppServer.v2.Thread>;
}): Array<CollabReceiverThread> {
  return params.receiverThreadIds.map((threadId) => ({
    threadId,
    thread: params.threadsById.get(threadId) ?? null,
  }));
}

export function enrichCollabAgentToolCallItem(params: {
  item: {
    id: string;
    tool: AppServer.v2.CollabAgentTool;
    status: AppServer.v2.CollabAgentToolCallStatus;
    senderThreadId: string;
    receiverThreadIds: Array<string>;
    prompt: string | null;
    model: string | null;
    reasoningEffort: AppServer.ReasoningEffort | null;
    agentsStates: { [key in string]?: AppServer.v2.CollabAgentState };
  };
  threadsById: Map<string, AppServer.v2.Thread>;
}): CollabAgentToolCallItem {
  return {
    type: "collabAgentToolCall",
    id: params.item.id,
    tool: params.item.tool,
    status: params.item.status,
    senderThreadId: params.item.senderThreadId,
    receiverThreadIds: params.item.receiverThreadIds,
    receiverThreads: getCollabReceiverThreads({
      receiverThreadIds: params.item.receiverThreadIds,
      threadsById: params.threadsById,
    }),
    prompt: params.item.prompt,
    model: params.item.model,
    reasoningEffort: params.item.reasoningEffort,
    agentsStates: params.item.agentsStates,
  };
}

export function normalizeIncomingThreadItem(params: {
  item: AppServer.v2.ThreadItem;
  threadsById: Map<string, AppServer.v2.Thread>;
  onCollabAgentToolCall?: (
    item: Extract<AppServer.v2.ThreadItem, { type: "collabAgentToolCall" }>,
  ) => void;
}): Item {
  if (params.item.type !== "collabAgentToolCall") {
    return params.item;
  }

  params.onCollabAgentToolCall?.(params.item);
  return enrichCollabAgentToolCallItem({
    item: params.item,
    threadsById: params.threadsById,
  });
}

export function hydrateMissingCollabReceiverThreads(params: {
  receiverThreadIds: Array<string>;
  threadsById: Map<string, AppServer.v2.Thread>;
  pendingThreadReads: Set<string>;
  readThreadById: (threadId: string) => Promise<AppServer.v2.Thread>;
  onThreadLoaded: (thread: AppServer.v2.Thread) => void;
  onReadError: (threadId: string, error: unknown) => void;
}): void {
  const missingThreadIds = params.receiverThreadIds.filter((threadId) => {
    return (
      !params.threadsById.has(threadId) &&
      !params.pendingThreadReads.has(threadId)
    );
  });
  if (missingThreadIds.length === 0) {
    return;
  }

  for (const threadId of missingThreadIds) {
    params.pendingThreadReads.add(threadId);
  }

  void Promise.all(
    missingThreadIds.map(async (threadId) => {
      try {
        const thread = await params.readThreadById(threadId);
        params.onThreadLoaded(thread);
      } catch (error) {
        params.onReadError(threadId, error);
      } finally {
        params.pendingThreadReads.delete(threadId);
      }
    }),
  );
}

export function registerAgentNicknameFromThread(
  thread: AppServer.v2.Thread,
): void {
  const agentNickname = getThreadAgentNickname(thread);
  if (agentNickname == null) {
    return;
  }

  registerAgentNicknameForSessionId(thread.id, agentNickname);
}

export function registerThreadMetadata(params: {
  thread: AppServer.v2.Thread;
  threadsById: Map<string, AppServer.v2.Thread>;
  conversations: Map<ConversationId, AppServerConversationState>;
  updateConversationState: (
    conversationId: ConversationId,
    updater: (draft: WritableDraft<AppServerConversationState>) => void,
    shouldBroadcast?: boolean,
  ) => void;
}): void {
  params.threadsById.set(params.thread.id, params.thread);
  registerAgentNicknameFromThread(params.thread);
  refreshCollabItemsForThread({
    threadId: params.thread.id,
    conversations: params.conversations,
    threadsById: params.threadsById,
    updateConversationState: params.updateConversationState,
  });
}

export function refreshCollabItemsForThread(params: {
  threadId: string;
  conversations: Map<ConversationId, AppServerConversationState>;
  threadsById: Map<string, AppServer.v2.Thread>;
  updateConversationState: (
    conversationId: ConversationId,
    updater: (draft: WritableDraft<AppServerConversationState>) => void,
    shouldBroadcast?: boolean,
  ) => void;
}): void {
  for (const [conversationId, conversation] of params.conversations.entries()) {
    const hasMatchingCollabItem = conversation.turns.some((turn) =>
      turn.items.some(
        (item) =>
          item.type === "collabAgentToolCall" &&
          item.receiverThreadIds.includes(params.threadId),
      ),
    );
    if (!hasMatchingCollabItem) {
      continue;
    }

    params.updateConversationState(
      conversationId,
      (draft) => {
        for (const turn of draft.turns) {
          for (const item of turn.items) {
            if (item.type !== "collabAgentToolCall") {
              continue;
            }
            if (!item.receiverThreadIds.includes(params.threadId)) {
              continue;
            }

            const nextReceiverThreads = getCollabReceiverThreads({
              receiverThreadIds: item.receiverThreadIds,
              threadsById: params.threadsById,
            });
            if (isEqual(item.receiverThreads, nextReceiverThreads)) {
              continue;
            }

            item.receiverThreads = castDraft(nextReceiverThreads);
          }
        }
      },
      false,
    );
  }
}
