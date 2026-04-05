import type { components } from "@oai/sa-server-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type * as AppServer from "app-server-types";
import { useScope } from "maitai";
import { useEffect, useEffectEvent, useState } from "react";
import { useIntl } from "react-intl";
import { useLocation } from "react-router";

import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import {
  getAppConnectFailedMessage,
  getAppConnectedMessage,
  getAppConnectStartedMessage,
  startAppConnect,
} from "@/apps/app-connect-actions";
import { useAppConnectOAuthState } from "@/apps/app-connect-oauth";
import { toast$ } from "@/components/toaster/toast-signal";
import { useWindowType } from "@/hooks/use-window-type";
import { messageBus } from "@/message-bus";
import { AppScope } from "@/scopes/app-scope";
import { useGate } from "@/statsig/statsig";
import { logger } from "@/utils/logger";

import { getPluginDisplayName } from "./get-plugin-display-name";
import {
  type PluginInstallSession as StorePluginInstallSession,
  type PluginRequiredAppStatus,
  usePluginInstallStore,
} from "./plugin-install-store";
import type { InstalledPlugin } from "./use-plugins";

export type PluginInstallSession =
  | {
      kind: "closed";
    }
  | {
      kind: "details";
      plugin: InstalledPlugin;
    }
  | {
      kind: "needsApps";
      plugin: InstalledPlugin;
      requiredApps: Array<{
        appId: string;
        description: string | null;
        installUrl: string | null;
        logoUrl: string | null;
        name: string;
        status: PluginRequiredAppStatus;
      }>;
    };

type ConnectableRequiredApp = Pick<
  Extract<PluginInstallSession, { kind: "needsApps" }>["requiredApps"][number],
  "appId" | "installUrl" | "name" | "status"
>;
type ToolPersonalizationMode = components["schemas"]["ToolPersonalizationMode"];

export function usePluginInstallFlow({
  apps,
  forceReloadPlugins,
  hardRefetchAppsList,
}: {
  apps: Array<AppServer.v2.AppInfo>;
  forceReloadPlugins: () => Promise<void>;
  hardRefetchAppsList: () => Promise<void>;
}): {
  closePluginInstall: () => void;
  connectRequiredApp: (appId: string) => Promise<void>;
  installPlugin: (
    appPersonalizationModes?: Record<string, ToolPersonalizationMode>,
  ) => Promise<void>;
  isInstalling: boolean;
  openPluginInstall: (plugin: InstalledPlugin) => void;
  session: PluginInstallSession;
} {
  const manager = useDefaultAppServerManager();
  const intl = useIntl();
  const location = useLocation();
  const scope = useScope(AppScope);
  const queryClient = useQueryClient();
  const windowType = useWindowType();
  const isInAppInstallEnabled = useGate(
    __statsigName("codex_rollout_apps_in_app_install"),
  );
  const {
    clearPendingAppConnect,
    isAppConnectPending,
    markAppConnectOAuthPending,
  } = useAppConnectOAuthState();
  const {
    closePluginInstall: closePluginInstallStore,
    markRequiredAppStatus,
    openPluginInstall: openPluginInstallStore,
    session: storeSession,
    setPluginInstallNeedsApps,
  } = usePluginInstallStore();
  const [savedAppPersonalizationModes, setAppPersonalizationModes] = useState<
    Record<string, ToolPersonalizationMode>
  >({});
  const installPluginMutation = useMutation({
    mutationFn: async (
      plugin: InstalledPlugin,
    ): Promise<AppServer.v2.PluginInstallResponse> => {
      return manager.installPlugin({
        marketplacePath: plugin.marketplacePath,
        pluginName: plugin.plugin.name,
      });
    },
  });
  const session = createPluginInstallSessionView({
    apps,
    isAppConnectPending,
    session: storeSession,
  });
  const allRequiredAppsConnected =
    session.kind === "needsApps" &&
    session.requiredApps.length > 0 &&
    session.requiredApps.every((app) => app.status === "connected");

  const finalizeConnectedPluginFlow = useEffectEvent(
    (
      connectedSession: Extract<PluginInstallSession, { kind: "needsApps" }>,
    ) => {
      closePluginInstallStore();
      scope.get(toast$).success(
        intl.formatMessage(
          {
            id: "plugins.install.ready",
            defaultMessage: "{pluginName} is ready.",
            description:
              "Toast shown when all required apps are connected for a plugin install flow",
          },
          {
            pluginName: getPluginDisplayName(connectedSession.plugin),
          },
        ),
      );
      void forceReloadPlugins().catch((error) => {
        logger.error("Failed to refresh plugins after plugin app setup", {
          safe: {},
          sensitive: { error },
        });
      });
    },
  );

  useEffect(() => {
    if (!allRequiredAppsConnected || session.kind !== "needsApps") {
      return;
    }

    finalizeConnectedPluginFlow(session);
  }, [allRequiredAppsConnected, session]);

  async function startRequiredAppConnect(
    requiredApp: ConnectableRequiredApp,
    appPersonalizationModes?: Record<string, ToolPersonalizationMode>,
  ): Promise<void> {
    if (requiredApp.status !== "pending") {
      return;
    }

    const installUrl = requiredApp.installUrl?.trim();
    if (!isInAppInstallEnabled && installUrl) {
      messageBus.dispatchMessage("open-in-browser", { url: installUrl });
      return;
    }

    clearPendingAppConnect({
      appId: requiredApp.appId,
    });
    markRequiredAppStatus({
      appId: requiredApp.appId,
      status: "launching",
    });

    const result = await startAppConnect({
      app: {
        id: requiredApp.appId,
        installUrl: requiredApp.installUrl,
        name: requiredApp.name,
      },
      openInBrowser: (url: string): void => {
        messageBus.dispatchMessage("open-in-browser", { url });
      },
      personalizationMode:
        appPersonalizationModes?.[requiredApp.appId] ??
        savedAppPersonalizationModes[requiredApp.appId] ??
        "NO_PERSONALIZATION",
      queryClient,
      windowType,
    });

    switch (result.kind) {
      case "connected-directly": {
        markRequiredAppStatus({
          appId: requiredApp.appId,
          status: "connected",
        });
        scope.get(toast$).success(
          getAppConnectedMessage({
            appName: requiredApp.name,
            intl,
          }),
        );
        try {
          await hardRefetchAppsList();
        } catch (error) {
          logger.error(
            "Failed to refresh apps after direct plugin app connect",
            {
              safe: {},
              sensitive: { error },
            },
          );
        }
        return;
      }
      case "oauth-started": {
        markRequiredAppStatus({
          appId: requiredApp.appId,
          status: "waitingForCallback",
        });
        markAppConnectOAuthPending({
          app: {
            id: requiredApp.appId,
            name: requiredApp.name,
          },
          redirectUrl: result.redirectUrl,
          returnTo: `${location.pathname}${location.search}${location.hash}`,
          resumeTarget: {
            kind: "plugin-install",
          },
        });
        scope.get(toast$).info(
          getAppConnectStartedMessage({
            intl,
            windowType,
          }),
        );
        return;
      }
      case "browser-fallback": {
        markRequiredAppStatus({
          appId: requiredApp.appId,
          status: "pending",
        });
        return;
      }
      case "failed": {
        markRequiredAppStatus({
          appId: requiredApp.appId,
          status: "pending",
        });
        scope.get(toast$).danger(getAppConnectFailedMessage(intl));
        return;
      }
    }
  }

  const openPluginInstall = (plugin: InstalledPlugin): void => {
    if (installPluginMutation.isPending) {
      return;
    }

    setAppPersonalizationModes({});
    installPluginMutation.reset();
    openPluginInstallStore(plugin);
  };

  const closePluginInstall = (): void => {
    if (installPluginMutation.isPending) {
      return;
    }

    setAppPersonalizationModes({});
    installPluginMutation.reset();
    closePluginInstallStore();
  };

  const installPlugin = async (
    appPersonalizationModes: Record<string, ToolPersonalizationMode> = {},
  ): Promise<void> => {
    if (installPluginMutation.isPending || storeSession.kind !== "details") {
      return;
    }

    const plugin = storeSession.plugin;

    let response: AppServer.v2.PluginInstallResponse;
    try {
      response = await installPluginMutation.mutateAsync(plugin);
    } catch (error) {
      logger.error("Failed to install plugin", {
        safe: {},
        sensitive: { error },
      });
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "plugins.install.error",
          defaultMessage: "Failed to install plugin",
          description: "Toast shown when installing a plugin fails",
        }),
      );
      return;
    }

    try {
      await forceReloadPlugins();
    } catch (error) {
      logger.error("Failed to refresh plugins after install", {
        safe: {},
        sensitive: { error },
      });
      scope.get(toast$).danger(
        intl.formatMessage(
          {
            id: "plugins.install.refreshError",
            defaultMessage:
              "Installed {pluginName}, but failed to refresh the plugin list",
            description:
              "Toast shown when a plugin installs successfully but the plugin list refresh fails",
          },
          {
            pluginName: getPluginDisplayName(plugin),
          },
        ),
      );
    }

    setAppPersonalizationModes(appPersonalizationModes);

    if (
      response.authPolicy === "ON_USE" ||
      response.appsNeedingAuth.length === 0
    ) {
      scope.get(toast$).success(
        intl.formatMessage(
          {
            id: "plugins.install.success",
            defaultMessage: "{pluginName} plugin installed",
            description: "Toast shown after a plugin is installed",
          },
          {
            pluginName: getPluginDisplayName(plugin),
          },
        ),
      );
      closePluginInstallStore();
      return;
    }

    setPluginInstallNeedsApps(response.appsNeedingAuth);

    // automatically start app connect for plugins with one app and ON_INSTALL auth policy
    if (
      response.authPolicy === "ON_INSTALL" &&
      response.appsNeedingAuth.length === 1
    ) {
      void startRequiredAppConnect(
        {
          appId: response.appsNeedingAuth[0].id,
          installUrl: response.appsNeedingAuth[0].installUrl,
          name: response.appsNeedingAuth[0].name,
          status: "pending",
        },
        appPersonalizationModes,
      );
    }
  };

  const connectRequiredApp = async (appId: string): Promise<void> => {
    if (session.kind !== "needsApps") {
      return;
    }

    const requiredApp = session.requiredApps.find((app) => app.appId === appId);
    if (
      requiredApp == null ||
      requiredApp.status === "connected" ||
      requiredApp.status === "launching" ||
      requiredApp.status === "waitingForCallback"
    ) {
      return;
    }

    await startRequiredAppConnect(requiredApp);
  };

  return {
    closePluginInstall,
    connectRequiredApp,
    installPlugin,
    isInstalling: installPluginMutation.isPending,
    openPluginInstall,
    session,
  };
}

function createPluginInstallSessionView({
  apps,
  isAppConnectPending,
  session,
}: {
  apps: Array<AppServer.v2.AppInfo>;
  isAppConnectPending: (appId: string) => boolean;
  session: StorePluginInstallSession;
}): PluginInstallSession {
  if (session.kind !== "needsApps") {
    return session;
  }

  const appsById = new Map<string, AppServer.v2.AppInfo>();
  apps.forEach((app) => {
    appsById.set(app.id, app);
  });

  return {
    kind: "needsApps",
    plugin: session.plugin,
    requiredApps: session.requiredApps.map((requiredApp) => {
      const matchingApp = appsById.get(requiredApp.app.id);
      let status = requiredApp.status;
      if (matchingApp?.isAccessible === true) {
        status = "connected";
      } else if (
        requiredApp.status === "waitingForCallback" &&
        !isAppConnectPending(requiredApp.app.id)
      ) {
        status = "pending";
      }

      return {
        appId: requiredApp.app.id,
        description: matchingApp?.description ?? requiredApp.app.description,
        installUrl: matchingApp?.installUrl ?? requiredApp.app.installUrl,
        logoUrl: matchingApp?.logoUrl ?? null,
        name: matchingApp?.name ?? requiredApp.app.name,
        status,
      };
    }),
  };
}
