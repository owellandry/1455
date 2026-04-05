import { useQueryClient } from "@tanstack/react-query";
import type * as AppServer from "app-server-types";
import { useState } from "react";
import { useLocation } from "react-router";

import {
  getAppConnectConnectorQueryOptions,
  getAppConnectRoute,
} from "@/apps/app-connect-actions";
import { useAppConnectOAuthState } from "@/apps/app-connect-oauth";
import { useWindowType } from "@/hooks/use-window-type";
import { messageBus } from "@/message-bus";
import { useGate } from "@/statsig/statsig";
import { logger } from "@/utils/logger";

export function useAppConnectFlow({
  onConnectStarted,
}: {
  onConnectStarted?: (app: AppServer.v2.AppInfo) => void;
} = {}): {
  connectingApp: AppServer.v2.AppInfo | null;
  clearConnectingApp: () => void;
  handleAppConnectOAuthStarted: (params: {
    app: {
      id: string;
      name: string;
    };
    redirectUrl: string;
  }) => void;
  handleConnectApp: (app: AppServer.v2.AppInfo) => Promise<void>;
  handleOpenAppUrl: (url: string | null) => void;
  isAppConnectPending: (appId: string) => boolean;
} {
  const location = useLocation();
  const windowType = useWindowType();
  const isInAppInstallEnabled = useGate(
    __statsigName("codex_rollout_apps_in_app_install"),
  );
  const queryClient = useQueryClient();
  const {
    clearPendingAppConnect,
    isAppConnectPending,
    markAppConnectOAuthPending,
  } = useAppConnectOAuthState();
  const [connectingApp, setConnectingApp] =
    useState<AppServer.v2.AppInfo | null>(null);

  const handleOpenAppUrl = (url: string | null): void => {
    const nextUrl = url?.trim();
    if (!nextUrl) {
      return;
    }
    messageBus.dispatchMessage("open-in-browser", {
      url: nextUrl,
    });
  };

  const handleConnectApp = async (app: AppServer.v2.AppInfo): Promise<void> => {
    clearPendingAppConnect({ appId: app.id });
    onConnectStarted?.(app);

    if (!isInAppInstallEnabled && app.installUrl?.trim()) {
      handleOpenAppUrl(app.installUrl);
      return;
    }

    try {
      const connector = await queryClient.fetchQuery(
        getAppConnectConnectorQueryOptions(app.id),
      );

      if (getAppConnectRoute({ app, connector, windowType }) === "chatgpt") {
        handleOpenAppUrl(app.installUrl);
        return;
      }
    } catch (error) {
      logger.error("Failed to resolve app connect flow {}", {
        safe: {
          templateArgs: [app.id],
        },
        sensitive: {
          error: error,
        },
      });
    }

    setConnectingApp(app);
  };

  const clearConnectingApp = (): void => {
    setConnectingApp(null);
  };

  const handleAppConnectOAuthStarted = ({
    app,
    redirectUrl,
  }: {
    app: {
      id: string;
      name: string;
    };
    redirectUrl: string;
  }): void => {
    markAppConnectOAuthPending({
      app,
      redirectUrl,
      returnTo: `${location.pathname}${location.search}${location.hash}`,
    });
  };

  return {
    connectingApp,
    clearConnectingApp,
    handleAppConnectOAuthStarted,
    handleConnectApp,
    handleOpenAppUrl,
    isAppConnectPending,
  };
}
