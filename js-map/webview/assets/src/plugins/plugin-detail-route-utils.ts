import type { InstalledPlugin } from "./use-plugins";

const PLUGIN_DETAIL_ROUTE_PREFIX = "/skills/plugins";
const PLUGIN_DETAIL_SOURCE_MANAGE = "manage";

export type PluginDetailRouteSource = typeof PLUGIN_DETAIL_SOURCE_MANAGE;

export function getPluginDetailPath(
  plugin: InstalledPlugin,
  options?: {
    source?: PluginDetailRouteSource;
  },
): string {
  const searchParams = new URLSearchParams({
    marketplacePath: plugin.marketplacePath,
    pluginName: plugin.plugin.name,
  });
  if (options?.source != null) {
    searchParams.set("source", options.source);
  }

  return `${PLUGIN_DETAIL_ROUTE_PREFIX}/${encodeURIComponent(plugin.plugin.id)}?${searchParams.toString()}`;
}

export function getPluginDetailRouteParams(search: string): {
  marketplacePath: string;
  pluginName: string;
  source: PluginDetailRouteSource | null;
} | null {
  const searchParams = new URLSearchParams(search);
  const marketplacePath = searchParams.get("marketplacePath")?.trim();
  const pluginName = searchParams.get("pluginName")?.trim();
  const sourceValue = searchParams.get("source")?.trim();

  if (!marketplacePath || !pluginName) {
    return null;
  }

  return {
    marketplacePath,
    pluginName,
    source:
      sourceValue === PLUGIN_DETAIL_SOURCE_MANAGE
        ? PLUGIN_DETAIL_SOURCE_MANAGE
        : null,
  };
}
