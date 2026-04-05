import type React from "react";

import McpIcon from "@/icons/mcp.svg";
import type { InstalledPlugin } from "@/plugins/use-plugins";
import { getSkillIcon } from "@/skills/get-skill-icon";

import {
  type ComposerMentionInsertItem,
  getMentionInsertItemFromPlugin,
  getPluginMentionPath,
} from "./mention-item";

export function findPluginForMention({
  label,
  path,
  plugins,
}: {
  label: string;
  path?: string;
  plugins: Array<InstalledPlugin>;
}): InstalledPlugin | undefined {
  const normalizedLabel = label.trim().toLowerCase();

  if (path != null && path.length > 0) {
    const pluginFromPath = plugins.find((plugin) => {
      return getPluginMentionPath(plugin.plugin.id) === path;
    });
    if (pluginFromPath != null) {
      return pluginFromPath;
    }
  }

  return plugins.find((plugin) => {
    return (
      plugin.plugin.id.toLowerCase() === normalizedLabel ||
      plugin.plugin.name.toLowerCase() === normalizedLabel ||
      plugin.displayName?.toLowerCase() === normalizedLabel
    );
  });
}

export function getPluginMentionDetail(plugin: InstalledPlugin): string | null {
  return plugin.description ?? (plugin.marketplaceName || null);
}

export function getPluginMentionInsertItem(
  plugin: InstalledPlugin,
): ComposerMentionInsertItem {
  return getMentionInsertItemFromPlugin(plugin);
}

export function getPluginMentionIcon(
  plugin: InstalledPlugin,
): React.ComponentType<{ className?: string }> {
  const mention = getPluginMentionInsertItem(plugin);
  return getSkillIcon(null, {
    size: "small",
    smallOnly: true,
    iconSmall: plugin.logoPath ?? "",
    basePath: mention.path,
    fallbackName: mention.name,
    fallbackDescription: mention.description,
    fallbackIcon: McpIcon,
  });
}
