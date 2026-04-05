import type { InstalledPlugin } from "@/plugins/use-plugins";
import type { PluginsPageSectionDescriptor } from "@/skills/plugins-page-utils";
import { normalizePath } from "@/utils/path";

export type PluginMarketplaceFilterOption = {
  label: string;
  subLabel: string | null;
  value: string;
};

type PluginMarketplaceFilterSeed = {
  label: string;
  marketplaceName: string;
  pathLabelSource: string;
  value: string;
};

const PLUGIN_MARKETPLACE_SUFFIX = "/.agents/plugins/marketplace.json";
const MARKETPLACE_FILE_SUFFIX = "/marketplace.json";
function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function normalizeMarketplaceKey(name: string): string {
  return normalizeName(name).replace(/[_-]+/g, " ");
}

export function getMarketplaceDisplayLabel(name: string): string {
  return normalizeMarketplaceKey(name) === "openai curated"
    ? "Built by OpenAI"
    : name;
}

export function hasCuratedMarketplace(
  plugins: Array<InstalledPlugin>,
): boolean {
  return plugins.some((plugin) => {
    return normalizeMarketplaceKey(plugin.marketplaceName) === "openai curated";
  });
}

function matchesSearchQuery(query: string, values: Array<string>): boolean {
  if (query.length === 0) {
    return true;
  }
  return values.join(" ").toLowerCase().includes(query);
}

export function selectPluginMarketplaceFilterOptions(
  plugins: Array<InstalledPlugin>,
): Array<PluginMarketplaceFilterOption> {
  const optionsByPath = new Map<string, PluginMarketplaceFilterSeed>();

  for (const plugin of plugins) {
    const marketplaceLabel =
      plugin.marketplaceDisplayName?.trim() || plugin.marketplaceName;
    if (marketplaceLabel.trim().length === 0) {
      continue;
    }
    if (optionsByPath.has(plugin.marketplacePath)) {
      continue;
    }
    optionsByPath.set(plugin.marketplacePath, {
      label: getMarketplaceDisplayLabel(marketplaceLabel),
      marketplaceName: plugin.marketplaceName,
      pathLabelSource: getMarketplaceLabelSourcePath(plugin.marketplacePath),
      value: plugin.marketplacePath,
    });
  }

  const options = Array.from(optionsByPath.values());
  const subLabelsByValue = new Map<string, string | null>();
  const optionsByLabel = new Map<string, Array<PluginMarketplaceFilterSeed>>();

  for (const option of options) {
    const existingOptions = optionsByLabel.get(option.label);
    if (existingOptions == null) {
      optionsByLabel.set(option.label, [option]);
      continue;
    }
    existingOptions.push(option);
  }

  for (const groupedOptions of optionsByLabel.values()) {
    if (groupedOptions.length <= 1) {
      subLabelsByValue.set(groupedOptions[0].value, null);
      continue;
    }

    const pathTailLabels = getShortestUniquePathTailLabels(
      groupedOptions.map((option) => option.pathLabelSource),
    );
    for (const [index, option] of groupedOptions.entries()) {
      subLabelsByValue.set(option.value, pathTailLabels[index] ?? null);
    }
  }

  return options
    .sort((a, b) => {
      const marketplaceOrderDifference =
        getMarketplaceSortRank(a.label) - getMarketplaceSortRank(b.label);
      if (marketplaceOrderDifference !== 0) {
        return marketplaceOrderDifference;
      }
      return (
        a.label.localeCompare(b.label) ||
        (subLabelsByValue.get(a.value) ?? "").localeCompare(
          subLabelsByValue.get(b.value) ?? "",
        )
      );
    })
    .map((option) => ({
      label: option.label,
      subLabel: subLabelsByValue.get(option.value) ?? null,
      value: option.value,
    }));
}

function getMarketplaceLabelSourcePath(marketplacePath: string): string {
  const normalizedPath = normalizePath(marketplacePath).replace(/\/+$/, "");
  if (normalizedPath.endsWith(PLUGIN_MARKETPLACE_SUFFIX)) {
    return normalizedPath.slice(0, -PLUGIN_MARKETPLACE_SUFFIX.length);
  }
  if (normalizedPath.endsWith(MARKETPLACE_FILE_SUFFIX)) {
    return normalizedPath.slice(0, -MARKETPLACE_FILE_SUFFIX.length);
  }
  return normalizedPath;
}

function getShortestUniquePathTailLabels(paths: Array<string>): Array<string> {
  const segmentsByPath = paths.map((path) => {
    return normalizePath(path).replace(/\/+$/, "").split("/").filter(Boolean);
  });
  const maxSegmentCount = Math.max(
    1,
    ...segmentsByPath.map((segments) => segments.length),
  );

  for (let segmentCount = 1; segmentCount <= maxSegmentCount; segmentCount++) {
    const tailLabels = segmentsByPath.map((segments) => {
      return formatPathTailLabel(segments, segmentCount);
    });
    if (new Set(tailLabels).size === tailLabels.length) {
      return tailLabels;
    }
  }

  return paths.map((path) => normalizePath(path));
}

function formatPathTailLabel(
  segments: Array<string>,
  segmentCount: number,
): string {
  const tail = segments.slice(-segmentCount).join("/");
  if (tail.length === 0) {
    return "";
  }
  if (segmentCount === 1) {
    return tail;
  }
  return segments.length > segmentCount ? `.../${tail}` : tail;
}

function getMarketplaceSortRank(label: string): number {
  switch (normalizeMarketplaceKey(label)) {
    case "codex official":
      return 0;
    case "openai curated":
      return 1;
    case "chatgpt official":
      return 2;
    default:
      return 3;
  }
}

export function selectFilteredPlugins({
  plugins,
  marketplacePath,
  query,
}: {
  plugins: Array<InstalledPlugin>;
  marketplacePath: string | null;
  query: string;
}): Array<InstalledPlugin> {
  return plugins.filter((plugin) => {
    return (
      (marketplacePath == null || plugin.marketplacePath === marketplacePath) &&
      (marketplacePath == null ||
        (plugin.marketplaceDisplayName?.trim() || plugin.marketplaceName).trim()
          .length > 0) &&
      matchesSearchQuery(query, [
        plugin.plugin.name,
        plugin.displayName ?? "",
        plugin.description ?? "",
        plugin.marketplaceDisplayName ?? "",
        plugin.marketplaceName,
      ])
    );
  });
}

export function selectEnabledInstalledPlugins(
  plugins: Array<InstalledPlugin>,
): Array<InstalledPlugin> {
  return plugins.filter((plugin) => {
    return plugin.plugin.installed && plugin.plugin.enabled;
  });
}

export function selectPluginSections(
  plugins: Array<InstalledPlugin>,
  featuredPluginIds: Array<string> = [],
): Array<{
  section: PluginsPageSectionDescriptor;
  plugins: Array<InstalledPlugin>;
}> {
  const featuredPluginIdSet = new Set(featuredPluginIds);
  const pluginsById = new Map(
    plugins.map((plugin) => [plugin.plugin.id, plugin] as const),
  );
  const featuredPlugins = featuredPluginIds.flatMap((pluginId) => {
    const plugin = pluginsById.get(pluginId);
    if (plugin == null) {
      return [];
    }

    return [plugin];
  });
  const pluginsByCategory = new Map<string, Array<InstalledPlugin>>();

  for (const plugin of plugins) {
    if (featuredPluginIdSet.has(plugin.plugin.id)) {
      continue;
    }

    const category = plugin.plugin.interface?.category ?? "Other";
    const categoryPlugins = pluginsByCategory.get(category);
    if (categoryPlugins == null) {
      pluginsByCategory.set(category, [plugin]);
      continue;
    }

    categoryPlugins.push(plugin);
  }

  const categorizedSections = Array.from(pluginsByCategory.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, categorizedPlugins]) => ({
      section: {
        id: `plugins-${normalizeName(category).replaceAll(" ", "-")}`,
        title: category,
      },
      plugins: categorizedPlugins,
    }));

  return featuredPlugins.length > 0
    ? [
        {
          section: {
            id: "plugins-featured",
            title: "Featured",
          },
          plugins: featuredPlugins,
        },
        ...categorizedSections,
      ]
    : categorizedSections;
}
