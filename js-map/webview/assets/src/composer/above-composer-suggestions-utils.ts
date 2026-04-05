import { getPluginRecommendationName } from "@/plugins/get-plugin-recommendation-name";
import type { InstalledPlugin } from "@/plugins/use-plugins";
import { RECOMMENDED_APP_NAMES } from "@/skills/recommended-apps-whitelist";

const PLAN_KEYWORD_REGEX = /\bplan\b/i;

export const PLAN_MODE_KEYWORD_SUGGESTION_ID = "keyword-plan-mode";

export function getRecommendedPluginKeywordSuggestionId(
  pluginId: string,
): string {
  return `keyword-install-recommended-plugin:${pluginId}`;
}

export function hasRecommendedPluginKeywordSuggestionMatch({
  composerText,
  plugins,
}: {
  composerText: string;
  plugins: Array<InstalledPlugin>;
}): boolean {
  for (const plugin of plugins) {
    if (!isRecommendedPlugin(plugin)) {
      continue;
    }
    const keywordRegex = buildPluginKeywordRegex(
      getPluginRecommendationName(plugin),
    );
    if (keywordRegex?.test(composerText)) {
      return true;
    }
  }
  return false;
}

export function shouldShowPlanKeywordSuggestion({
  composerText,
  hasPlanMode,
  isPlanMode,
  isDismissed,
}: {
  composerText: string;
  hasPlanMode: boolean;
  isPlanMode: boolean;
  isDismissed: boolean;
}): boolean {
  if (!hasPlanMode) {
    return false;
  }
  if (isPlanMode) {
    return false;
  }
  if (isDismissed) {
    return false;
  }
  return PLAN_KEYWORD_REGEX.test(composerText);
}

export function findRecommendedPluginKeywordSuggestion({
  composerText,
  plugins,
  dismissedSuggestionIds,
}: {
  composerText: string;
  plugins: Array<InstalledPlugin>;
  dismissedSuggestionIds: Set<string>;
}): InstalledPlugin | null {
  let bestMatch: {
    plugin: InstalledPlugin;
    index: number;
  } | null = null;

  for (const plugin of plugins) {
    if (!isRecommendedPlugin(plugin)) {
      continue;
    }
    if (plugin.plugin.installed && plugin.plugin.enabled) {
      continue;
    }

    const suggestionId = getRecommendedPluginKeywordSuggestionId(
      plugin.plugin.id,
    );
    if (dismissedSuggestionIds.has(suggestionId)) {
      continue;
    }

    const keywordRegex = buildPluginKeywordRegex(
      getPluginRecommendationName(plugin),
    );
    const match = keywordRegex?.exec(composerText);
    const matchIndex = match?.index;
    if (matchIndex == null) {
      continue;
    }

    if (bestMatch == null || matchIndex < bestMatch.index) {
      bestMatch = {
        plugin,
        index: matchIndex,
      };
    }
  }

  if (bestMatch == null) {
    return null;
  }

  return bestMatch.plugin;
}

function isRecommendedPlugin(plugin: InstalledPlugin): boolean {
  return RECOMMENDED_APP_NAMES.has(
    getPluginRecommendationName(plugin).trim().toLowerCase(),
  );
}

function buildPluginKeywordRegex(pluginName: string): RegExp | null {
  const normalizedName = pluginName.trim();
  if (normalizedName.length === 0) {
    return null;
  }
  return new RegExp(`\\b${escapeForRegex(normalizedName)}\\b`, "i");
}

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
