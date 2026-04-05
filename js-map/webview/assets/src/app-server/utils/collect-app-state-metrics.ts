import type { ConversationId, McpRequestId } from "protocol";

import type {
  AppServerConversationState,
  ReviewPaneSnapshotMetrics,
} from "../app-server-manager-types";
import type { AppStateMetrics } from "../webview-sampler";

export function collectAppStateMetrics(params: {
  conversations: Map<ConversationId, AppServerConversationState>;
  recentConversationIds: Array<ConversationId>;
  streamingConversations: Set<ConversationId>;
  requestPromises: Map<
    McpRequestId,
    {
      resolve: (value: unknown) => void;
      reject: (reason?: unknown) => void;
      method: string;
      startedAtMs: number;
      conversationId: string | null;
      timeoutMs: number;
    }
  >;
  reviewPaneSnapshotMetrics: ReviewPaneSnapshotMetrics;
}): AppStateMetrics {
  let turnCountTotalLoaded = 0;
  let itemCountTotalLoaded = 0;
  let maxTurnsInSingleThread = 0;
  let maxItemsInSingleTurn = 0;
  let inflightTurnCount = 0;
  let threadCountWithInflightTurn = 0;

  for (const conversation of params.conversations.values()) {
    let hasInflightTurn = false;
    turnCountTotalLoaded += conversation.turns.length;
    maxTurnsInSingleThread = Math.max(
      maxTurnsInSingleThread,
      conversation.turns.length,
    );
    for (const turn of conversation.turns) {
      itemCountTotalLoaded += turn.items.length;
      if (turn.status === "inProgress") {
        inflightTurnCount += 1;
        hasInflightTurn = true;
      }
      maxItemsInSingleTurn = Math.max(maxItemsInSingleTurn, turn.items.length);
    }
    if (hasInflightTurn) {
      threadCountWithInflightTurn += 1;
    }
  }

  return {
    threadCountTotal: params.conversations.size,
    threadCountLoadedRecent: params.recentConversationIds.length,
    threadCountActive: params.streamingConversations.size,
    threadCountWithInflightTurn,
    turnCountTotalLoaded,
    itemCountTotalLoaded,
    maxTurnsInSingleThread,
    maxItemsInSingleTurn,
    pendingRequestCount: params.requestPromises.size,
    inflightTurnCount,
    reviewDiffFilesTotal: params.reviewPaneSnapshotMetrics.reviewDiffFilesTotal,
    reviewDiffLinesTotal: params.reviewPaneSnapshotMetrics.reviewDiffLinesTotal,
    reviewDiffBytesEstimate:
      params.reviewPaneSnapshotMetrics.reviewDiffBytesEstimate,
  };
}
