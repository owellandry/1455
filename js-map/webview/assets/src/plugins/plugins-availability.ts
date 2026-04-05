import {
  type QueryKey,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type * as AppServer from "app-server-types";
import { useScope } from "maitai";
import type { JsonValue } from "protocol";
import { defineMessages, useIntl } from "react-intl";

import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import { toast$ } from "@/components/toaster/toast-signal";
import {
  type UserConfigQueryData,
  USER_CONFIG_QUERY_KEY,
  useUserConfig,
} from "@/queries/config-queries";
import { useInvalidateQueriesAndBroadcast } from "@/queries/invalidate-queries-and-broadcast";
import { isPluginDetailQueryKey } from "@/queries/plugin-detail-queries";
import { AppScope } from "@/scopes/app-scope";
import { logger } from "@/utils/logger";

import { PLUGINS_QUERY_KEY, type PluginsQueryData } from "./use-plugins";

type UpdatePluginEnabledParams = {
  pluginDisplayName: string;
  pluginId: string;
  enabled: boolean;
};

type UninstallPluginParams = {
  pluginDisplayName: string;
  pluginId: string;
};

type UpdatePluginEnabledMutationContext = {
  previousPluginLists: Array<readonly [QueryKey, PluginsQueryData]>;
  previousUserConfig: UserConfigQueryData | undefined;
};

const USER_SAVED_CONFIG_QUERY_KEY = ["user-saved-config"];
const PLUGINS_CONFIG_KEY = "plugins";

const messages = defineMessages({
  enabledSuccess: {
    id: "plugins.card.enableSuccess",
    defaultMessage: "{pluginName} plugin enabled",
    description: "Toast shown after successfully enabling a plugin",
  },
  disabledSuccess: {
    id: "plugins.card.disableSuccess",
    defaultMessage: "{pluginName} plugin disabled",
    description: "Toast shown after successfully disabling a plugin",
  },
  toggleError: {
    id: "plugins.card.toggleError",
    defaultMessage: "Failed to update plugin",
    description:
      "Toast message shown when enabling or disabling a plugin fails",
  },
  uninstallSuccess: {
    id: "plugins.card.uninstallSuccess",
    defaultMessage: "{pluginName} plugin uninstalled",
    description: "Toast shown after successfully uninstalling a plugin",
  },
  uninstallError: {
    id: "plugins.card.uninstallError",
    defaultMessage: "Failed to uninstall plugin",
    description: "Toast message shown when uninstalling a plugin fails",
  },
});

export function useUpdatePluginEnabled(): {
  pendingPluginId: string | null;
  setPluginEnabled: (
    params: UpdatePluginEnabledParams,
  ) => Promise<AppServer.v2.ConfigWriteResponse>;
} {
  const manager = useDefaultAppServerManager();
  const { data: userConfigData } = useUserConfig();
  const queryClient = useQueryClient();
  const invalidateQueriesAndBroadcast = useInvalidateQueriesAndBroadcast();
  const intl = useIntl();
  const scope = useScope(AppScope);
  const mutation = useMutation<
    AppServer.v2.ConfigWriteResponse,
    Error,
    UpdatePluginEnabledParams,
    UpdatePluginEnabledMutationContext
  >({
    mutationFn: async ({
      pluginId,
      enabled,
    }: UpdatePluginEnabledParams): Promise<AppServer.v2.ConfigWriteResponse> => {
      return manager.batchWriteConfigValue({
        edits: buildPluginEnabledConfigEdits({
          pluginId,
          enabled,
        }),
        filePath: userConfigData?.configWriteTarget?.filePath ?? null,
        expectedVersion:
          userConfigData?.configWriteTarget?.expectedVersion ?? null,
      });
    },
    onMutate: async ({ pluginId, enabled }) => {
      await Promise.all([
        queryClient.cancelQueries({
          queryKey: PLUGINS_QUERY_KEY,
        }),
        queryClient.cancelQueries({
          queryKey: USER_CONFIG_QUERY_KEY,
        }),
      ]);

      const previousUserConfig = queryClient.getQueryData<UserConfigQueryData>(
        USER_CONFIG_QUERY_KEY,
      );
      const previousPluginLists = queryClient
        .getQueriesData<PluginsQueryData>({
          queryKey: PLUGINS_QUERY_KEY,
        })
        .flatMap(([queryKey, pluginList]) => {
          if (pluginList == null || isPluginDetailQueryKey(queryKey)) {
            return [];
          }

          return [[queryKey, pluginList] as const];
        });

      for (const [queryKey, previousPluginList] of previousPluginLists) {
        queryClient.setQueryData<PluginsQueryData>(
          queryKey,
          getPluginListWithEnabledState(previousPluginList, pluginId, enabled),
        );
      }

      if (previousUserConfig) {
        const nextConfig: UserConfigQueryData["config"] = {
          ...previousUserConfig.config,
        };
        nextConfig.plugins = buildOptimisticPluginsConfig(
          previousUserConfig.config.plugins,
          pluginId,
          enabled,
        );
        queryClient.setQueryData<UserConfigQueryData>(USER_CONFIG_QUERY_KEY, {
          ...previousUserConfig,
          config: nextConfig,
        });
      }

      return {
        previousPluginLists,
        previousUserConfig,
      };
    },
    onSuccess: (_response, { enabled, pluginDisplayName }): void => {
      scope.get(toast$).success(
        intl.formatMessage(
          enabled ? messages.enabledSuccess : messages.disabledSuccess,
          {
            pluginName: pluginDisplayName,
          },
        ),
      );
    },
    onError: (error, _variables, context): void => {
      logger.error("Failed to update plugin enabled state", {
        safe: {},
        sensitive: { error },
      });
      if (context?.previousUserConfig) {
        queryClient.setQueryData<UserConfigQueryData>(
          USER_CONFIG_QUERY_KEY,
          context.previousUserConfig,
        );
      }
      for (const [
        queryKey,
        previousPluginList,
      ] of context?.previousPluginLists ?? []) {
        queryClient.setQueryData<PluginsQueryData>(
          queryKey,
          previousPluginList,
        );
      }
      scope.get(toast$).danger(intl.formatMessage(messages.toggleError));
    },
    onSettled: async (): Promise<void> => {
      await invalidatePluginQueries(invalidateQueriesAndBroadcast);
    },
  });

  return {
    pendingPluginId: mutation.isPending ? mutation.variables?.pluginId : null,
    setPluginEnabled: mutation.mutateAsync,
  };
}

export function useUninstallPlugin(): {
  pendingUninstallPluginId: string | null;
  uninstallPlugin: (params: UninstallPluginParams) => Promise<void>;
} {
  const manager = useDefaultAppServerManager();
  const invalidateQueriesAndBroadcast = useInvalidateQueriesAndBroadcast();
  const intl = useIntl();
  const scope = useScope(AppScope);

  const mutation = useMutation<undefined, Error, UninstallPluginParams>({
    mutationFn: async ({ pluginId }): Promise<undefined> => {
      await manager.uninstallPlugin({
        pluginId,
      });
      return undefined;
    },
    onSuccess: (_response, { pluginDisplayName }): void => {
      scope.get(toast$).success(
        intl.formatMessage(messages.uninstallSuccess, {
          pluginName: pluginDisplayName,
        }),
      );
    },
    onError: (error): void => {
      logger.error("Failed to uninstall plugin", {
        safe: {},
        sensitive: { error },
      });
      scope.get(toast$).danger(intl.formatMessage(messages.uninstallError));
    },
    onSettled: async (): Promise<void> => {
      await invalidatePluginQueries(invalidateQueriesAndBroadcast);
    },
  });

  return {
    pendingUninstallPluginId: mutation.isPending
      ? (mutation.variables?.pluginId ?? null)
      : null,
    uninstallPlugin: mutation.mutateAsync,
  };
}

function buildPluginEnabledConfigEdits({
  pluginId,
  enabled,
}: Omit<
  UpdatePluginEnabledParams,
  "pluginDisplayName"
>): Array<AppServer.v2.ConfigEdit> {
  return [
    {
      keyPath: `${PLUGINS_CONFIG_KEY}.${pluginId}.enabled`,
      value: enabled,
      mergeStrategy: "upsert",
    },
  ];
}

function buildOptimisticPluginsConfig(
  plugins: AppServer.v2.Config["plugins"],
  pluginId: string,
  enabled: boolean,
): { [key in string]?: JsonValue } {
  const existingPluginsConfig =
    plugins != null && typeof plugins === "object" && !Array.isArray(plugins)
      ? plugins
      : {};
  const existingPluginConfig = existingPluginsConfig[pluginId];

  return {
    ...existingPluginsConfig,
    [pluginId]:
      existingPluginConfig != null &&
      typeof existingPluginConfig === "object" &&
      !Array.isArray(existingPluginConfig)
        ? {
            ...existingPluginConfig,
            enabled,
          }
        : {
            enabled,
          },
  };
}

function getPluginListWithEnabledState(
  pluginList: PluginsQueryData,
  pluginId: string,
  enabled: boolean,
): PluginsQueryData {
  return {
    ...pluginList,
    plugins: pluginList.plugins.map((plugin) => {
      if (plugin.plugin.id !== pluginId || plugin.plugin.enabled === enabled) {
        return plugin;
      }

      return {
        ...plugin,
        plugin: {
          ...plugin.plugin,
          enabled,
        },
      };
    }),
  };
}

async function invalidatePluginQueries(
  invalidateQueriesAndBroadcast: (queryKey: Array<string>) => Promise<void>,
): Promise<void> {
  await Promise.all([
    invalidateQueriesAndBroadcast(PLUGINS_QUERY_KEY),
    invalidateQueriesAndBroadcast(USER_CONFIG_QUERY_KEY),
    invalidateQueriesAndBroadcast(USER_SAVED_CONFIG_QUERY_KEY),
  ]);
}
