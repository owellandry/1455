import type { InstalledPlugin } from "./use-plugins";

export function getPluginRecommendationName(plugin: InstalledPlugin): string {
  return (
    plugin.displayName ??
    plugin.plugin.interface?.displayName ??
    plugin.plugin.name
  );
}
