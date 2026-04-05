import sortBy from "lodash/sortBy";

import { useIsPluginsEnabled } from "@/hooks/use-is-plugins-enabled";
import { selectEnabledInstalledPlugins } from "@/plugins/plugins-page-selectors";
import { usePlugins } from "@/plugins/use-plugins";

import type {
  AtMentionMenuSection,
  AtMentionSourceState,
} from "./at-mention-source-types";
import {
  getPluginMentionDetail,
  getPluginMentionIcon,
  getPluginMentionInsertItem,
} from "./plugin-mention-utils";
import { scoreQueryMatch } from "./score-query-match";

const PLUGINS_SECTION_TITLE = {
  id: "composer.atMentionList.plugins",
  defaultMessage: "Plugins",
  description: "Section header for plugin results in the @ mention list.",
} as const;

const PLUGINS_LOADING_STATE = {
  id: "composer.atMentionList.pluginsLoading",
  defaultMessage: "Loading plugins…",
  description:
    "Shown in the plugins section when plugin discovery is loading and no results have arrived yet",
} as const;

export function usePluginAtMentionSource({
  query,
  roots,
}: {
  query: string;
  roots: Array<string>;
}): AtMentionSourceState {
  const isPluginsEnabled = useIsPluginsEnabled();
  const { plugins, isLoading } = usePlugins(roots);
  if (!isPluginsEnabled) {
    return { sections: [] };
  }
  const trimmedQuery = query.trim();
  const enabledPlugins = selectEnabledInstalledPlugins(plugins);
  const filteredPlugins =
    trimmedQuery.length === 0
      ? enabledPlugins
      : sortPluginsByQuery(enabledPlugins, trimmedQuery).filter(
          (plugin) => getPluginMatchScore(plugin, trimmedQuery) > 0,
        );
  const emptyState =
    isLoading && filteredPlugins.length === 0 ? PLUGINS_LOADING_STATE : null;
  if (filteredPlugins.length === 0 && emptyState == null) {
    return { sections: [] };
  }

  const sections: Array<AtMentionMenuSection> = [
    {
      id: "plugins",
      title: PLUGINS_SECTION_TITLE,
      items: filteredPlugins.map((plugin) => {
        const mention = getPluginMentionInsertItem(plugin);
        return {
          key: `plugin:${mention.path}`,
          label: mention.displayName,
          detail: getPluginMentionDetail(plugin),
          icon: getPluginMentionIcon(plugin),
          insertMention: ({ composerController, mentionState }): void => {
            composerController.insertMentionFromAtMention(
              mention,
              mentionState,
            );
          },
        };
      }),
      emptyState,
      isLoading,
    },
  ];

  return {
    sections,
  };
}

function sortPluginsByQuery<
  T extends {
    description: string | null;
    displayName: string | null;
    marketplaceName: string;
    plugin: {
      id: string;
      name: string;
    };
  },
>(plugins: Array<T>, query: string): Array<T> {
  return sortBy(
    plugins.map((plugin, index) => ({
      plugin,
      score: getPluginMatchScore(plugin, query),
      index,
    })),
    [
      (entry): number => -entry.score,
      (entry): string => entry.plugin.displayName ?? entry.plugin.plugin.name,
      (entry): number => entry.index,
    ],
  ).map((entry) => entry.plugin);
}

function getPluginMatchScore<
  T extends {
    description: string | null;
    displayName: string | null;
    marketplaceName: string;
    plugin: {
      id: string;
      name: string;
    };
  },
>(plugin: T, query: string): number {
  return Math.max(
    scoreQueryMatch(plugin.plugin.id, query),
    scoreQueryMatch(plugin.plugin.name, query),
    scoreQueryMatch(plugin.displayName ?? "", query),
    scoreQueryMatch(`@${plugin.displayName ?? plugin.plugin.name}`, query),
    scoreQueryMatch(plugin.description ?? "", query),
    scoreQueryMatch(plugin.marketplaceName, query),
  );
}
