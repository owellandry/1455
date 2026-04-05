import sortBy from "lodash/sortBy";
import { defineMessage } from "react-intl";

import { scoreQueryMatch } from "@/composer/score-query-match";
import { getAgentMentionColorCssValueForSessionId } from "@/local-conversation/items/multi-agent-mentions";

import type {
  AtMentionMenuSection,
  AtMentionSourceState,
} from "./at-mention-source-types";
import type { BackgroundSubagentMentionItem } from "./use-background-subagent-mention-items";

const LIVE_AGENTS_SECTION_TITLE = defineMessage({
  id: "composer.atMentionList.liveAgents",
  defaultMessage: "Live agents",
  description: "Section header for live agent results in the @ mention list.",
});

export function getBackgroundAgentAtMentionSource({
  backgroundAgents,
  excludedConversationIds = [],
  query,
}: {
  backgroundAgents: Array<BackgroundSubagentMentionItem>;
  excludedConversationIds?: Array<string>;
  query: string;
}): AtMentionSourceState | null {
  if (backgroundAgents.length === 0) {
    return null;
  }

  const filteredBackgroundAgents = backgroundAgents.filter(
    (agent) => !excludedConversationIds.includes(agent.conversationId),
  );

  const trimmedQuery = query.trim();
  const filteredAgents =
    trimmedQuery.length === 0
      ? filteredBackgroundAgents
      : sortAgentsByQuery(filteredBackgroundAgents, trimmedQuery).filter(
          (agent) => getAgentMatchScore(agent, trimmedQuery) > 0,
        );

  const sections: Array<AtMentionMenuSection> = [
    {
      id: "agents",
      title: LIVE_AGENTS_SECTION_TITLE,
      items: filteredAgents.map((agent) => ({
        key: `agent:${agent.conversationId}`,
        label: agent.displayName,
        detail: agent.agentRole,
        labelStyle: {
          color: getAgentMentionColorCssValueForSessionId(agent.conversationId),
        },
        insertMention: ({ composerController, mentionState }): void => {
          composerController.insertAgentMention(agent, mentionState);
        },
      })),
      emptyState: null,
      isLoading: false,
    },
  ];

  return {
    sections,
  };
}

function sortAgentsByQuery(
  agents: Array<BackgroundSubagentMentionItem>,
  query: string,
): Array<BackgroundSubagentMentionItem> {
  return sortBy(
    agents.map((agent, index) => ({
      agent,
      score: getAgentMatchScore(agent, query),
      index,
    })),
    [
      (entry): number => -entry.score,
      (entry): string => entry.agent.displayName,
      (entry): number => entry.index,
    ],
  ).map((entry) => entry.agent);
}

function formatAgentStatus(agent: BackgroundSubagentMentionItem): string {
  switch (agent.status) {
    case "active": {
      if (agent.statusSummary != null) {
        return agent.statusSummary;
      }
      return "Thinking";
    }
    case "waiting": {
      return "Waiting";
    }
    case "done": {
      return "Done";
    }
  }
}

function getAgentMatchScore(
  agent: BackgroundSubagentMentionItem,
  query: string,
): number {
  return Math.max(
    scoreQueryMatch(agent.displayName, query),
    scoreQueryMatch(`@${agent.displayName}`, query),
    scoreQueryMatch(agent.agentRole ?? "", query),
    scoreQueryMatch(formatAgentStatus(agent), query),
  );
}
