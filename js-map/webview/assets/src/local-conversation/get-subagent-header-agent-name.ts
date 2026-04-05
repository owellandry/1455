import type { ConversationId } from "protocol";

import { getAgentMentionForSessionId } from "./items/multi-agent-mentions";

export function getSubagentHeaderAgentName({
  agentNickname,
  conversationId,
}: {
  agentNickname: string | null;
  conversationId: ConversationId;
}): string {
  const agentName =
    agentNickname?.trim() || getAgentMentionForSessionId(conversationId);
  return agentName.startsWith("@") ? agentName.slice(1) : agentName;
}
