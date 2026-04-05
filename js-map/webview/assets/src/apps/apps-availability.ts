import { useMutation, useQueryClient } from "@tanstack/react-query";
import type * as AppServer from "app-server-types";
import { useScope } from "maitai";
import { defineMessages, useIntl } from "react-intl";

import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import { toast$ } from "@/components/toaster/toast-signal";
import { APPS_LIST_QUERY_KEY } from "@/queries/apps-queries";
import { USER_CONFIG_QUERY_KEY, useUserConfig } from "@/queries/config-queries";
import { useInvalidateQueriesAndBroadcast } from "@/queries/invalidate-queries-and-broadcast";
import { AppScope } from "@/scopes/app-scope";
import { logger } from "@/utils/logger";

type UpdateAppEnabledParams = {
  appId: string;
  enabled: boolean;
};

type UpdateAppEnabledMutationContext = {
  previousApps: Array<AppServer.v2.AppInfo> | undefined;
};

const APPS_CONFIG_KEY = "apps";
const messages = defineMessages({
  enableSuccess: {
    id: "apps.enable.success",
    defaultMessage: "{appName} app enabled",
    description: "Toast shown after successfully enabling an app",
  },
  disableSuccess: {
    id: "apps.disable.success",
    defaultMessage: "{appName} app disabled",
    description: "Toast shown after successfully disabling an app",
  },
  updateError: {
    id: "apps.update.error",
    defaultMessage: "Failed to update app",
    description: "Toast shown when enabling or disabling an app fails",
  },
});

export function useUpdateAppEnabled(): {
  setAppEnabled: (params: UpdateAppEnabledParams) => Promise<void>;
  isUpdating: boolean;
  updatingAppId: string | null;
} {
  const manager = useDefaultAppServerManager();
  const { data: userConfigData } = useUserConfig();
  const queryClient = useQueryClient();
  const invalidateQueriesAndBroadcast = useInvalidateQueriesAndBroadcast();
  const intl = useIntl();
  const scope = useScope(AppScope);

  const invalidateQueries = async (): Promise<void> => {
    await Promise.all([
      invalidateQueriesAndBroadcast(APPS_LIST_QUERY_KEY),
      invalidateQueriesAndBroadcast(USER_CONFIG_QUERY_KEY),
      invalidateQueriesAndBroadcast(["user-saved-config"]),
    ]);
  };

  const mutation = useMutation<
    undefined,
    Error,
    UpdateAppEnabledParams,
    UpdateAppEnabledMutationContext
  >({
    mutationFn: async ({ appId, enabled }): Promise<undefined> => {
      await manager.batchWriteConfigValue({
        edits: buildAppEnabledConfigEdits({
          appId,
          enabled,
        }),
        filePath: userConfigData?.configWriteTarget?.filePath ?? null,
        expectedVersion:
          userConfigData?.configWriteTarget?.expectedVersion ?? null,
        reloadUserConfig: true,
      });
      return undefined;
    },
    onMutate: async ({ appId, enabled }) => {
      await queryClient.cancelQueries({
        queryKey: APPS_LIST_QUERY_KEY,
      });

      const previousApps =
        queryClient.getQueryData<Array<AppServer.v2.AppInfo>>(
          APPS_LIST_QUERY_KEY,
        );
      if (previousApps) {
        queryClient.setQueryData<Array<AppServer.v2.AppInfo>>(
          APPS_LIST_QUERY_KEY,
          previousApps.map((app) => {
            if (app.id !== appId) {
              return app;
            }
            if (app.isEnabled === enabled) {
              return app;
            }
            return {
              ...app,
              isEnabled: enabled,
            };
          }),
        );
      }

      return { previousApps };
    },
    onSuccess: (_result, { appId, enabled }): void => {
      const appName =
        queryClient
          .getQueryData<Array<AppServer.v2.AppInfo>>(APPS_LIST_QUERY_KEY)
          ?.find((app) => app.id === appId)?.name ?? appId;

      scope
        .get(toast$)
        .success(
          intl.formatMessage(
            enabled ? messages.enableSuccess : messages.disableSuccess,
            { appName },
          ),
        );
    },
    onError: (error, _params, context) => {
      logger.error("Failed to update app enablement", {
        safe: {},
        sensitive: { error },
      });
      scope.get(toast$).danger(intl.formatMessage(messages.updateError));
      if (context?.previousApps) {
        queryClient.setQueryData<Array<AppServer.v2.AppInfo>>(
          APPS_LIST_QUERY_KEY,
          context.previousApps,
        );
      }
    },
    onSettled: invalidateQueries,
  });

  return {
    setAppEnabled: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    updatingAppId: mutation.isPending
      ? (mutation.variables?.appId ?? null)
      : null,
  };
}

function buildAppEnabledConfigEdits({
  appId,
  enabled,
}: UpdateAppEnabledParams): Array<AppServer.v2.ConfigEdit> {
  return [
    {
      keyPath: `${APPS_CONFIG_KEY}.${appId}.enabled`,
      value: enabled,
      mergeStrategy: "upsert",
    },
  ];
}
