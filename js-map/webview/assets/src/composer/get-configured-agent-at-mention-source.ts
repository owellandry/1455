import sortBy from "lodash/sortBy";
import startCase from "lodash/startCase";
import type { LocalCustomAgentMetadata } from "protocol";
import { defineMessage } from "react-intl";

import type {
  AtMentionMenuSection,
  AtMentionSourceState,
} from "./at-mention-source-types";
import { scoreQueryMatch } from "./score-query-match";

const CUSTOM_AGENTS_SECTION_TITLE = defineMessage({
  id: "composer.atMentionList.customAgents",
  defaultMessage: "Custom agents",
  description:
    "Section header for configured custom agent results in the @ mention list.",
});

export function getConfiguredAgentAtMentionSource({
  agents,
  query,
}: {
  agents: Array<LocalCustomAgentMetadata>;
  query: string;
}): AtMentionSourceState | null {
  if (agents.length === 0) {
    return null;
  }

  const trimmedQuery = query.trim();
  const filteredAgents =
    trimmedQuery.length === 0
      ? agents
      : sortAgentsByQuery(agents, trimmedQuery).filter(
          (agent) => getAgentMatchScore(agent, trimmedQuery) > 0,
        );

  const sections: Array<AtMentionMenuSection> = [
    {
      id: "custom-agents",
      title: CUSTOM_AGENTS_SECTION_TITLE,
      items: filteredAgents.map((agent) => ({
        key: `subagent:${agent.roleName}`,
        label: startCase(agent.roleName),
        detail: agent.description,
        insertMention: ({ composerController, mentionState }): void => {
          composerController.insertConfiguredAgentMention(agent, mentionState);
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
  agents: Array<LocalCustomAgentMetadata>,
  query: string,
): Array<LocalCustomAgentMetadata> {
  return sortBy(
    agents.map((agent, index) => ({
      agent,
      score: getAgentMatchScore(agent, query),
      index,
    })),
    [
      (entry): number => -entry.score,
      (entry): string => entry.agent.roleName,
      (entry): number => entry.index,
    ],
  ).map((entry) => entry.agent);
}

function getAgentMatchScore(
  agent: LocalCustomAgentMetadata,
  query: string,
): number {
  return Math.max(
    scoreQueryMatch(agent.roleName, query),
    scoreQueryMatch(`@${agent.roleName}`, query),
    scoreQueryMatch(agent.description ?? "", query),
    ...agent.nicknameCandidates.map((nickname) =>
      scoreQueryMatch(nickname, query),
    ),
  );
}
