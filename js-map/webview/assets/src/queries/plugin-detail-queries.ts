import { type QueryKey, useQuery } from "@tanstack/react-query";
import type * as AppServer from "app-server-types";

import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import { useIsPluginsEnabled } from "@/hooks/use-is-plugins-enabled";
import { readImageFileAsDataUrl } from "@/plugins/read-image-file-as-data-url";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";

export const PLUGIN_DETAIL_QUERY_KEY: Array<string> = ["plugins", "detail"];

type UsePluginDetailResult = {
  errorMessage: string | null;
  isLoading: boolean;
  plugin: AppServer.v2.PluginDetail | null;
  refetch: () => Promise<void>;
};

export function usePluginDetail({
  marketplacePath,
  pluginName,
  enabled: callerEnabled = true,
}: {
  marketplacePath: string | null;
  pluginName: string | null;
  enabled?: boolean;
}): UsePluginDetailResult {
  const appServerManager = useDefaultAppServerManager();
  const isPluginsEnabled = useIsPluginsEnabled();
  const enabled =
    isPluginsEnabled && callerEnabled && !!marketplacePath && !!pluginName;
  const pluginDetailQuery = useQuery({
    queryKey: getPluginDetailQueryKey({
      marketplacePath,
      pluginName,
    }),
    queryFn: async (): Promise<AppServer.v2.PluginDetail> => {
      const { plugin } = await appServerManager.readPlugin({
        marketplacePath: marketplacePath ?? "",
        pluginName: pluginName ?? "",
      });
      const logoDataUrlPromise = readImageFileAsDataUrl(
        plugin.summary.interface?.logo,
      );
      const skillImageDataUrlsPromise = Promise.all(
        plugin.skills.map(async (skill) => {
          if (skill.interface == null) {
            return null;
          }

          const [iconSmallDataUrl, iconLargeDataUrl] = await Promise.all([
            readImageFileAsDataUrl(skill.interface.iconSmall),
            readImageFileAsDataUrl(skill.interface.iconLarge),
          ]);

          return {
            iconSmallDataUrl,
            iconLargeDataUrl,
          };
        }),
      );
      const [logoDataUrl, skillImageDataUrls] = await Promise.all([
        logoDataUrlPromise,
        skillImageDataUrlsPromise,
      ]);

      return inlinePluginDetailImagesForWebview(plugin, {
        logoDataUrl,
        skillImageDataUrls,
      });
    },
    enabled,
    staleTime: QUERY_STALE_TIME.FIVE_MINUTES,
  });

  if (!enabled) {
    return {
      errorMessage: null,
      isLoading: false,
      plugin: null,
      refetch: async (): Promise<void> => {},
    };
  }

  return {
    errorMessage: pluginDetailQuery.error
      ? String(pluginDetailQuery.error.message)
      : null,
    isLoading: pluginDetailQuery.isLoading,
    plugin: pluginDetailQuery.data ?? null,
    refetch: async (): Promise<void> => {
      await pluginDetailQuery.refetch();
    },
  };
}

export function getPluginDetailQueryKey({
  marketplacePath,
  pluginName,
}: {
  marketplacePath: string | null;
  pluginName: string | null;
}): Array<unknown> {
  return [...PLUGIN_DETAIL_QUERY_KEY, marketplacePath ?? "", pluginName ?? ""];
}

export function isPluginDetailQueryKey(queryKey: QueryKey): boolean {
  return PLUGIN_DETAIL_QUERY_KEY.every((queryKeyPart, index) => {
    return queryKey[index] === queryKeyPart;
  });
}

function inlinePluginDetailImagesForWebview(
  plugin: AppServer.v2.PluginDetail,
  {
    logoDataUrl,
    skillImageDataUrls,
  }: {
    logoDataUrl: string | null;
    skillImageDataUrls: Array<{
      iconSmallDataUrl: string | null;
      iconLargeDataUrl: string | null;
    } | null>;
  },
): AppServer.v2.PluginDetail {
  const summaryInterface = plugin.summary.interface;
  const skills = plugin.skills.map((skill, index) => {
    const skillImageDataUrl = skillImageDataUrls[index] ?? null;
    if (skill.interface == null || skillImageDataUrl == null) {
      return skill;
    }

    return {
      ...skill,
      interface: {
        ...skill.interface,
        ...(skillImageDataUrl.iconSmallDataUrl != null
          ? { iconSmall: skillImageDataUrl.iconSmallDataUrl }
          : {}),
        ...(skillImageDataUrl.iconLargeDataUrl != null
          ? { iconLarge: skillImageDataUrl.iconLargeDataUrl }
          : {}),
      },
    };
  });

  return {
    ...plugin,
    summary:
      logoDataUrl == null || summaryInterface == null
        ? plugin.summary
        : {
            ...plugin.summary,
            interface: {
              ...summaryInterface,
              logo: logoDataUrl,
            },
          },
    skills,
  };
}
