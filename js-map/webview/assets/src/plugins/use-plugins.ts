import { useQuery } from "@tanstack/react-query";
import type * as AppServer from "app-server-types";
import { isAbsoluteFilesystemPath } from "protocol";

import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import { useIsPluginsEnabled } from "@/hooks/use-is-plugins-enabled";
import { useInvalidateQueriesAndBroadcast } from "@/queries/invalidate-queries-and-broadcast";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { useFetchFromVSCode } from "@/vscode-api";

import { readImageFileAsDataUrl } from "./read-image-file-as-data-url";

export const PLUGINS_QUERY_KEY: Array<string> = ["plugins"];

export type InstalledPlugin = {
  description: string | null;
  displayName: string | null;
  logoPath: string | null;
  marketplaceDisplayName: string | null;
  marketplaceName: string;
  marketplacePath: string;
  plugin: AppServer.v2.PluginSummary;
};

export type PluginsQueryData = {
  featuredPluginIds: Array<string>;
  plugins: Array<InstalledPlugin>;
};

type UsePluginsResult = {
  featuredPluginIds: Array<string>;
  plugins: Array<InstalledPlugin>;
  errorMessage: string | null;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => Promise<Array<InstalledPlugin>>;
  forceReload: () => Promise<void>;
};

const EMPTY_FEATURED_PLUGIN_IDS: Array<string> = [];
const EMPTY_PLUGINS: Array<InstalledPlugin> = [];

export function createInstalledPluginFromPluginDetail(
  plugin: AppServer.v2.PluginDetail,
): InstalledPlugin {
  return {
    description:
      plugin.summary.interface?.shortDescription ?? plugin.description ?? null,
    displayName: plugin.summary.interface?.displayName ?? null,
    logoPath: plugin.summary.interface?.logo ?? null,
    marketplaceDisplayName: null,
    marketplaceName: plugin.marketplaceName,
    marketplacePath: plugin.marketplacePath,
    plugin: plugin.summary,
  };
}

export function usePlugins(
  rootsOverrideCwd?: string | Array<string>,
  options?: {
    enabled?: boolean;
  },
): UsePluginsResult {
  const appServerManager = useDefaultAppServerManager();
  const isPluginsEnabled = useIsPluginsEnabled();
  const enabled = isPluginsEnabled && (options?.enabled ?? true);
  const invalidateQueriesAndBroadcast = useInvalidateQueriesAndBroadcast();
  const activeRootsQuery = useFetchFromVSCode("workspace-root-options", {
    queryConfig: {
      enabled: enabled && rootsOverrideCwd === undefined,
    },
  });
  const roots = getPluginRoots({
    rootsOverrideCwd,
    workspaceRoots: activeRootsQuery.data?.roots,
  });
  const shouldFetchPlugins =
    enabled && (rootsOverrideCwd !== undefined || activeRootsQuery.isFetched);

  const pluginsQuery = useQuery({
    queryKey: getPluginsQueryKey(roots),
    queryFn: async (): Promise<PluginsQueryData> => {
      const [homePluginsResponse, cwdPluginsResponse] = await Promise.all([
        appServerManager.listPlugins({}),
        roots.length > 0
          ? appServerManager.listPlugins({ cwds: roots })
          : Promise.resolve<AppServer.v2.PluginListResponse>({
              featuredPluginIds: [],
              marketplaceLoadErrors: [],
              marketplaces: [],
              remoteSyncError: null,
            }),
      ]);

      return {
        featuredPluginIds: selectFeaturedPluginIds({
          cwdPluginsResponse,
          homePluginsResponse,
        }),
        plugins: await inlinePluginLogosForWebview(
          getDiscoveredPlugins([
            ...homePluginsResponse.marketplaces,
            ...cwdPluginsResponse.marketplaces,
          ]),
        ),
      };
    },
    enabled: shouldFetchPlugins,
    staleTime: QUERY_STALE_TIME.FIVE_MINUTES,
    gcTime: Infinity,
  });

  async function forceReloadPlugins(): Promise<void> {
    await invalidateQueriesAndBroadcast(PLUGINS_QUERY_KEY);
    await pluginsQuery.refetch();
  }

  if (!enabled) {
    return {
      featuredPluginIds: EMPTY_FEATURED_PLUGIN_IDS,
      plugins: EMPTY_PLUGINS,
      errorMessage: null,
      isLoading: false,
      isFetching: false,
      refetch: async (): Promise<Array<InstalledPlugin>> => EMPTY_PLUGINS,
      forceReload: async (): Promise<void> => {},
    };
  }

  return {
    featuredPluginIds:
      pluginsQuery.data?.featuredPluginIds ?? EMPTY_FEATURED_PLUGIN_IDS,
    plugins: pluginsQuery.data?.plugins ?? EMPTY_PLUGINS,
    errorMessage: pluginsQuery.error
      ? String(pluginsQuery.error.message)
      : null,
    isLoading: activeRootsQuery.isLoading || pluginsQuery.isLoading,
    isFetching: activeRootsQuery.isFetching || pluginsQuery.isFetching,
    refetch: async (): Promise<Array<InstalledPlugin>> => {
      const result = await pluginsQuery.refetch();
      return result.data?.plugins ?? EMPTY_PLUGINS;
    },
    forceReload: forceReloadPlugins,
  };
}

export function getPluginsQueryKey(roots: Array<string>): Array<unknown> {
  return [...PLUGINS_QUERY_KEY, roots];
}

export function selectFeaturedPluginIds({
  cwdPluginsResponse,
  homePluginsResponse,
}: {
  cwdPluginsResponse: AppServer.v2.PluginListResponse;
  homePluginsResponse: AppServer.v2.PluginListResponse;
}): Array<string> {
  return (
    cwdPluginsResponse.featuredPluginIds ??
    homePluginsResponse.featuredPluginIds ??
    []
  );
}

async function inlinePluginLogosForWebview(
  plugins: Array<InstalledPlugin>,
): Promise<Array<InstalledPlugin>> {
  return Promise.all(
    plugins.map(async (plugin) => {
      const logoDataUrl = await readImageFileAsDataUrl(plugin.logoPath);
      if (logoDataUrl == null) {
        return plugin;
      }

      return {
        ...plugin,
        logoPath: logoDataUrl,
        plugin: plugin.plugin.interface
          ? {
              ...plugin.plugin,
              interface: {
                ...plugin.plugin.interface,
                logo: logoDataUrl,
              },
            }
          : plugin.plugin,
      };
    }),
  );
}

export function getPluginRoots({
  rootsOverrideCwd,
  workspaceRoots,
}: {
  rootsOverrideCwd?: string | Array<string>;
  workspaceRoots?: Array<string>;
}): Array<string> {
  if (Array.isArray(rootsOverrideCwd)) {
    return filterAbsolutePluginRoots(rootsOverrideCwd);
  }
  if (typeof rootsOverrideCwd === "string") {
    return filterAbsolutePluginRoots([rootsOverrideCwd]);
  }
  return filterAbsolutePluginRoots(workspaceRoots ?? []);
}

function filterAbsolutePluginRoots(roots: Array<string>): Array<string> {
  return roots
    .map((root) => root.trim())
    .filter((root) => isAbsoluteFilesystemPath(root));
}

function getDiscoveredPlugins(
  appServerMarketplaces: Array<AppServer.v2.PluginMarketplaceEntry>,
): Array<InstalledPlugin> {
  const pluginsByPath = new Map<string, InstalledPlugin>();

  for (const marketplace of appServerMarketplaces) {
    for (const plugin of marketplace.plugins) {
      if (pluginsByPath.has(plugin.source.path)) {
        continue;
      }

      pluginsByPath.set(plugin.source.path, {
        description: plugin.interface?.shortDescription ?? null,
        displayName: plugin.interface?.displayName ?? null,
        logoPath: plugin.interface?.logo ?? null,
        marketplaceDisplayName: marketplace.interface?.displayName ?? null,
        marketplaceName: marketplace.name,
        marketplacePath: marketplace.path,
        plugin,
      });
    }
  }

  return Array.from(pluginsByPath.values());
}
