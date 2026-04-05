import { defineMessage } from "react-intl";

import { useIsBackgroundSubagentsEnabled } from "@/hooks/use-is-background-subagents-enabled";
import { useConfiguredAgentRoles } from "@/queries/config-queries";
import { useDebouncedValue } from "@/utils/use-debounced-value";

import {
  combineAtMentionSections,
  type AtMentionMenuSection,
} from "./at-mention-source-types";
import { getBackgroundAgentAtMentionSource } from "./get-background-agent-at-mention-source";
import { getConfiguredAgentAtMentionSource } from "./get-configured-agent-at-mention-source";
import type { BackgroundSubagentMentionItem } from "./use-background-subagent-mention-items";
import { useFileAtMentionSource } from "./use-file-at-mention-source";
import { usePluginAtMentionSource } from "./use-plugin-at-mention-source";
import { useSkillAtMentionSource } from "./use-skill-at-mention-source";

const AGENTS_SECTION_TITLE = defineMessage({
  id: "composer.atMentionList.agents",
  defaultMessage: "Agents",
  description: "Section header for agent results in the @ mention list.",
});

export const MAX_AT_MENTION_ITEMS = 8;
export const MAX_PLUGIN_AT_MENTION_ITEMS = 3;
export const MAX_SKILL_AT_MENTION_ITEMS = 2;

export function useAtMentionSections({
  appServerManager,
  backgroundAgents = [],
  excludedAgentConversationIds = [],
  query,
  roots,
}: {
  appServerManager?: Parameters<
    typeof useSkillAtMentionSource
  >[0]["appServerManager"];
  backgroundAgents?: Array<BackgroundSubagentMentionItem>;
  excludedAgentConversationIds?: Array<string>;
  query: string;
  roots: Array<string>;
}): {
  sections: Array<AtMentionMenuSection>;
} {
  const isBackgroundSubagentsEnabled = useIsBackgroundSubagentsEnabled();
  const debouncedFileQuery = useDebouncedValue(query, 100);
  const fileSource = useFileAtMentionSource({
    query: debouncedFileQuery,
    roots,
  });
  const pluginSource = usePluginAtMentionSource({
    query,
    roots,
  });
  const skillSource = useSkillAtMentionSource({
    appServerManager,
    query,
    roots,
  });
  const { data: configuredAgentRolesData } = useConfiguredAgentRoles(
    roots,
    isBackgroundSubagentsEnabled,
  );
  const liveCustomAgentRoles = new Set(
    backgroundAgents.flatMap((agent) => {
      if (
        agent.agentRole == null ||
        excludedAgentConversationIds.includes(agent.conversationId)
      ) {
        return [];
      }

      return [agent.agentRole];
    }),
  );
  const configuredAgentRoles =
    configuredAgentRolesData?.roles.filter(
      (role) => !liveCustomAgentRoles.has(role.roleName),
    ) ?? [];
  const backgroundAgentSource = getBackgroundAgentAtMentionSource({
    backgroundAgents,
    excludedConversationIds: excludedAgentConversationIds,
    query,
  });
  const configuredAgentSource = isBackgroundSubagentsEnabled
    ? getConfiguredAgentAtMentionSource({
        agents: configuredAgentRoles,
        query,
      })
    : null;
  const liveAgentSection = backgroundAgentSource?.sections[0] ?? null;
  const customAgentSection = configuredAgentSource?.sections[0] ?? null;
  const agentItems = [
    ...(liveAgentSection?.items ?? []),
    ...(customAgentSection?.items ?? []),
  ];
  const agentsSection =
    agentItems.length === 0
      ? null
      : {
          id: "agents",
          title: AGENTS_SECTION_TITLE,
          items: agentItems,
          emptyState: null,
          isLoading: false,
        };
  const sections = clampAtMentionSectionsToBudget(
    clampAtMentionSectionItems(
      combineAtMentionSections([
        agentsSection == null ? null : { sections: [agentsSection] },
        pluginSource,
        skillSource,
        fileSource,
      ]),
      query,
    ),
  );

  return {
    sections,
  };
}

export function clampAtMentionSectionItems(
  sections: Array<AtMentionMenuSection>,
  query = "",
): Array<AtMentionMenuSection> {
  return sections.map((section) => {
    const maxItems = getMaxItemsForAtMentionSection(section.id, query);
    if (maxItems == null || section.items.length <= maxItems) {
      return section;
    }

    return {
      ...section,
      items: section.items.slice(0, maxItems),
    };
  });
}

export function clampAtMentionSectionsToBudget(
  sections: Array<AtMentionMenuSection>,
): Array<AtMentionMenuSection> {
  let remainingItems = MAX_AT_MENTION_ITEMS;

  return sections.flatMap((section) => {
    if (section.items.length === 0) {
      if (section.emptyState == null) {
        return [];
      }
      return [section];
    }

    if (remainingItems === 0) {
      return [];
    }

    const items = section.items.slice(0, remainingItems);
    remainingItems -= items.length;

    return [
      {
        ...section,
        items,
      },
    ];
  });
}

function getMaxItemsForAtMentionSection(
  sectionId: string,
  query: string,
): number | null {
  const hasQuery = query.trim().length > 0;
  switch (sectionId) {
    case "plugins": {
      return hasQuery ? MAX_PLUGIN_AT_MENTION_ITEMS : null;
    }
    case "skills": {
      return MAX_SKILL_AT_MENTION_ITEMS;
    }
    default: {
      return null;
    }
  }
}
