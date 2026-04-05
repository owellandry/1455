import type { AppServerConversationState } from "../app-server-manager-types";
import type { ConversationMetaSnapshot } from "./conversation-meta-snapshot";
import { getSubagentSourceMetadata } from "./get-subagent-source-metadata";

export function toConversationMetaSnapshot(
  conversation: AppServerConversationState,
): ConversationMetaSnapshot {
  const lastTurn = conversation.turns[conversation.turns.length - 1] ?? null;
  const subagentSourceMetadata = getSubagentSourceMetadata(conversation.source);
  return {
    id: conversation.id,
    requestsRef: conversation.requests,
    turnsLength: conversation.turns.length,
    lastTurnId: lastTurn?.turnId ?? null,
    lastTurnStatus: lastTurn?.status ?? null,
    createdAtMs: conversation.createdAt,
    updatedAtMs: conversation.updatedAt,
    title: conversation.title,
    hasUnreadTurn: conversation.hasUnreadTurn,
    resumeState: conversation.resumeState,
    threadRuntimeStatus: conversation.threadRuntimeStatus,
    cwd: conversation.cwd,
    gitInfoBranch: conversation.gitInfo?.branch ?? null,
    isSubagentSource: subagentSourceMetadata != null,
    subagentParentThreadId: subagentSourceMetadata?.parentThreadId ?? null,
    subagentSpinnerProjectionSignature:
      getSubagentSpinnerProjectionSignature(conversation),
  };
}

function getSubagentSpinnerProjectionSignature(
  conversation: AppServerConversationState,
): string {
  const parts: Array<string> = [];

  for (const turn of conversation.turns) {
    for (const item of turn.items ?? []) {
      if (item.type !== "collabAgentToolCall") {
        continue;
      }

      for (const receiverThreadId of item.receiverThreadIds) {
        const agentState = item.agentsStates?.[receiverThreadId];
        if (agentState == null) {
          continue;
        }

        const isActive = agentState.status === "running";
        parts.push(`${receiverThreadId}:${isActive ? "1" : "0"}`);
      }
    }
  }

  parts.sort();
  return parts.join("|");
}
