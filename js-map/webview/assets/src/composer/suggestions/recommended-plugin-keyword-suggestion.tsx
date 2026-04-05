import type {
  AboveComposerSuggestion,
  AboveComposerSuggestionMatchContext,
} from "@/composer/above-composer-suggestions-types";
import MpcIcon from "@/icons/mcp.svg";
import { getPluginDisplayName } from "@/plugins/get-plugin-display-name";

import {
  findRecommendedPluginKeywordSuggestion,
  getRecommendedPluginKeywordSuggestionId,
} from "../above-composer-suggestions-utils";

export function buildRecommendedPluginKeywordSuggestion({
  intl,
  composerText,
  pluginKeywordSuggestionState,
  dismissedSuggestionIds,
  setDismissedSuggestionIds,
}: AboveComposerSuggestionMatchContext): AboveComposerSuggestion | null {
  if (!pluginKeywordSuggestionState.isReady) {
    return null;
  }

  const matchedPlugin = findRecommendedPluginKeywordSuggestion({
    composerText,
    plugins: pluginKeywordSuggestionState.plugins,
    dismissedSuggestionIds,
  });
  if (matchedPlugin == null) {
    return null;
  }

  const suggestionId = getRecommendedPluginKeywordSuggestionId(
    matchedPlugin.plugin.id,
  );
  const isInstalled = matchedPlugin.plugin.installed;
  const pluginLabel = getPluginDisplayName(matchedPlugin);
  const actionLabel = isInstalled
    ? intl.formatMessage({
        id: "composer.aboveSuggestion.recommendedPluginEnable.action",
        defaultMessage: "Enable",
        description:
          "Primary button label for enabling an above-composer recommended plugin",
      })
    : intl.formatMessage({
        id: "composer.aboveSuggestion.recommendedPluginInstall.action",
        defaultMessage: "Install",
        description:
          "Primary button label for installing an above-composer recommended plugin",
      });

  return {
    id: suggestionId,
    title: intl.formatMessage(
      {
        id: "composer.aboveSuggestion.recommendedPlugin.title",
        defaultMessage: "Use {pluginLabel} plugin for this prompt",
        description: "Title for the above-composer suggested plugin action",
      },
      {
        pluginLabel,
      },
    ),
    icon: MpcIcon,
    logoUrl: matchedPlugin.logoPath,
    logoAlt: pluginLabel,
    actionLabel,
    actionDisabled: pluginKeywordSuggestionState.pendingPluginId != null,
    dismissOnAction: false,
    onAction: async (): Promise<void> => {
      if (isInstalled) {
        await pluginKeywordSuggestionState.enablePlugin(matchedPlugin);
        return;
      }

      pluginKeywordSuggestionState.openPluginInstall(matchedPlugin);
    },
    onDismiss: (): void => {
      setDismissedSuggestionIds((prev) => {
        if (prev.includes(suggestionId)) {
          return prev;
        }
        return [...prev, suggestionId];
      });
    },
  };
}
