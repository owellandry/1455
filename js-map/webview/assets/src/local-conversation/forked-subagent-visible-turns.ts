import type { AppServerConversationState } from "@/app-server/app-server-manager-types";

export function getForkedSubagentVisibleTurns({
  conversation,
  parentConversation,
}: {
  conversation: {
    resumeState: AppServerConversationState["resumeState"];
    turns: AppServerConversationState["turns"];
  };
  parentConversation: {
    turns: AppServerConversationState["turns"];
  };
}): AppServerConversationState["turns"] {
  if (conversation.resumeState !== "resumed") {
    return conversation.turns;
  }

  const parentTurnIds = new Set<string>();
  for (const turn of parentConversation.turns) {
    if (turn.turnId != null) {
      parentTurnIds.add(turn.turnId);
    }
  }

  return conversation.turns.filter((turn) => {
    return turn.turnId == null || !parentTurnIds.has(turn.turnId);
  });
}
