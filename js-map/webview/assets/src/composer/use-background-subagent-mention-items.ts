import type { ConversationId } from "protocol";
import { useMemo } from "react";

import type { AppServerManager } from "@/app-server/app-server-manager";
import type { AppServerConversationState } from "@/app-server/app-server-manager-types";

import {
  collectBackgroundSubagentDisplayRows,
  collectBackgroundSubagentMemberships,
  getFirstBackgroundSubagentApprovalRow,
  type BackgroundSubagentApprovalRow,
  type BackgroundSubagentDisplayRow,
  type BackgroundSubagentMembership,
} from "./background-subagents";
import {
  getAgentMentionInsertItem,
  type AgentMentionInsertItem,
} from "./mention-item";
import { useBackgroundSubagentConversations } from "./use-background-subagent-conversations";

export type BackgroundSubagentMentionItem = AgentMentionInsertItem & {
  conversationId: ConversationId;
  agentRole: string | null;
  status: BackgroundSubagentDisplayRow["status"];
  statusSummary: string | null;
};

export function useBackgroundSubagentMentionItems({
  activeConversationId,
  conversation,
  enabled,
  manager,
}: {
  activeConversationId: ConversationId | null;
  conversation: Pick<AppServerConversationState, "turns"> | null;
  enabled: boolean;
  manager: AppServerManager;
}): {
  memberships: Array<BackgroundSubagentMembership>;
  rows: Array<BackgroundSubagentDisplayRow>;
  mentionItems: Array<BackgroundSubagentMentionItem>;
  firstApproval: BackgroundSubagentApprovalRow | null;
} {
  const memberships = useMemo(() => {
    if (!enabled) {
      return [];
    }

    return collectBackgroundSubagentMemberships(conversation);
  }, [conversation, enabled]);
  const childConversationIds = memberships.map(
    (membership) => membership.conversationId,
  );
  const childConversations = useBackgroundSubagentConversations({
    manager,
    childConversationIds,
  });

  const rows = !enabled
    ? []
    : collectBackgroundSubagentDisplayRows({
        conversation,
        memberships,
        childConversations,
        childConversationSuppressedStates: memberships.map((membership) =>
          manager.isConversationSuppressedAfterArchive(
            membership.conversationId,
          ),
        ),
      });

  const mentionItems = rows.map((row) => ({
    ...getAgentMentionInsertItem({
      conversationId: row.conversationId,
      displayName: row.displayName,
    }),
    conversationId: row.conversationId,
    agentRole: row.agentRole,
    status: row.status,
    statusSummary: row.statusSummary,
  }));

  const firstApproval = useMemo(() => {
    if (!enabled) {
      return null;
    }

    return getFirstBackgroundSubagentApprovalRow({
      activeConversationId,
      memberships,
      childConversations,
    });
  }, [activeConversationId, childConversations, enabled, memberships]);

  return {
    memberships,
    rows,
    mentionItems,
    firstApproval,
  };
}
