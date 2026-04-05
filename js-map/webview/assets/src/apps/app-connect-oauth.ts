import { useQueryClient } from "@tanstack/react-query";
import { atom, useAtom } from "jotai";

import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import { hardRefetchAppsListQuery } from "@/queries/apps-queries";
import { useInvalidateQueriesAndBroadcast } from "@/queries/invalidate-queries-and-broadcast";
import { logger } from "@/utils/logger";
import { CodexRequest } from "@/utils/request";

type AppConnectOAuthCallbackPayload = {
  fullRedirectUrl: string;
};

type AppConnectOAuthCallbackRouteState = {
  fullRedirectUrl: string;
  returnTo?: string;
};

export type CompleteAppConnectOAuthCallbackResult =
  | {
      kind: "missing-callback-data";
    }
  | {
      kind: "request-failed";
    }
  | {
      kind: "success";
      appName: string;
    };

export type AppConnectResumeTarget =
  | {
      kind: "apps-tab";
    }
  | {
      kind: "plugin-install";
    };

export type PendingAppConnect = {
  appId: string;
  appName: string;
  claimed: boolean;
  oauthState: string;
  returnTo: string;
  resumeTarget: AppConnectResumeTarget;
};

const aPendingAppConnectByOauthState = atom<Record<string, PendingAppConnect>>(
  {},
);

export function useAppConnectOAuthState(): {
  claimAppConnectOAuthCallback: (fullRedirectUrl: string) => boolean;
  clearPendingAppConnect: (params: {
    oauthState?: string;
    appId?: string;
  }) => void;
  getPendingAppConnectForCallbackUrl: (
    fullRedirectUrl: string,
  ) => PendingAppConnect | null;
  isAppConnectPending: (appId: string) => boolean;
  markAppConnectOAuthPending: (params: {
    app: {
      id: string;
      name: string;
    };
    redirectUrl: string;
    returnTo: string;
    resumeTarget?: AppConnectResumeTarget;
  }) => void;
} {
  const [pendingAppConnectByOauthState, setPendingAppConnectByOauthState] =
    useAtom(aPendingAppConnectByOauthState);

  const clearPendingAppConnect = ({
    oauthState,
    appId,
  }: {
    oauthState?: string;
    appId?: string;
  }): void => {
    if (oauthState != null) {
      setPendingAppConnectByOauthState((current) => {
        if (!(oauthState in current)) {
          return current;
        }
        const { [oauthState]: _removedEntry, ...next } = current;
        return next;
      });
      return;
    }
    if (appId == null) {
      return;
    }
    setPendingAppConnectByOauthState((current) => {
      const nextEntries = Object.entries(current).filter(([, entry]) => {
        return entry.appId !== appId;
      });
      return nextEntries.reduce<Record<string, PendingAppConnect>>(
        (next, [key, entry]) => {
          next[key] = entry;
          return next;
        },
        {},
      );
    });
  };

  const claimAppConnectOAuthCallback = (fullRedirectUrl: string): boolean => {
    const oauthState = getOauthStateFromUrl(fullRedirectUrl);
    if (oauthState == null) {
      return false;
    }
    const pendingAppConnect = pendingAppConnectByOauthState[oauthState] ?? null;
    if (pendingAppConnect == null || pendingAppConnect.claimed) {
      return false;
    }
    setPendingAppConnectByOauthState((current) => {
      const currentEntry = current[oauthState] ?? null;
      if (currentEntry == null || currentEntry.claimed) {
        return current;
      }
      return {
        ...current,
        [oauthState]: {
          ...currentEntry,
          claimed: true,
        },
      };
    });
    return true;
  };

  const getPendingAppConnectForCallbackUrl = (
    fullRedirectUrl: string,
  ): PendingAppConnect | null => {
    const oauthState = getOauthStateFromUrl(fullRedirectUrl);
    if (oauthState != null) {
      return pendingAppConnectByOauthState[oauthState] ?? null;
    }
    const appId = getAppConnectAppIdFromUrl(fullRedirectUrl);
    if (appId == null) {
      return null;
    }
    return (
      Object.values(pendingAppConnectByOauthState).find((entry) => {
        return entry.appId === appId;
      }) ?? null
    );
  };

  const isAppConnectPending = (appId: string): boolean => {
    return Object.values(pendingAppConnectByOauthState).some((entry) => {
      return entry.appId === appId;
    });
  };

  const markAppConnectOAuthPending = ({
    app,
    redirectUrl,
    returnTo,
    resumeTarget = {
      kind: "apps-tab",
    },
  }: {
    app: {
      id: string;
      name: string;
    };
    redirectUrl: string;
    returnTo: string;
    resumeTarget?: AppConnectResumeTarget;
  }): void => {
    const oauthState = getOauthStateFromUrl(redirectUrl);
    if (oauthState == null) {
      return;
    }
    setPendingAppConnectByOauthState((current) => ({
      ...current,
      [oauthState]: {
        appId: app.id,
        appName: app.name,
        claimed: false,
        oauthState,
        returnTo,
        resumeTarget,
      },
    }));
  };

  return {
    claimAppConnectOAuthCallback,
    clearPendingAppConnect,
    getPendingAppConnectForCallbackUrl,
    isAppConnectPending,
    markAppConnectOAuthPending,
  };
}

export function useCompleteAppConnectOAuthCallback(): (
  payload: AppConnectOAuthCallbackPayload,
) => Promise<CompleteAppConnectOAuthCallbackResult> {
  const appServerManager = useDefaultAppServerManager();
  const queryClient = useQueryClient();
  const invalidateQueriesAndBroadcast = useInvalidateQueriesAndBroadcast();
  const { clearPendingAppConnect, getPendingAppConnectForCallbackUrl } =
    useAppConnectOAuthState();

  return async ({
    fullRedirectUrl,
  }: AppConnectOAuthCallbackPayload): Promise<CompleteAppConnectOAuthCallbackResult> => {
    const nextRedirectUrl = fullRedirectUrl.trim();
    const pendingAppConnect =
      nextRedirectUrl.length === 0
        ? null
        : getPendingAppConnectForCallbackUrl(nextRedirectUrl);
    const oauthState =
      pendingAppConnect?.oauthState ??
      getOauthStateFromUrl(nextRedirectUrl) ??
      undefined;
    const appId =
      pendingAppConnect?.appId ??
      getAppConnectAppIdFromUrl(nextRedirectUrl) ??
      undefined;

    if (nextRedirectUrl.length === 0) {
      clearPendingAppConnect({
        oauthState,
        appId,
      });
      return { kind: "missing-callback-data" };
    }

    try {
      const response = await CodexRequest.safePost(
        "/aip/connectors/links/oauth/callback",
        {
          requestBody: {
            full_redirect_url: nextRedirectUrl,
          },
        },
      );

      const appName =
        response.link?.name?.trim() || pendingAppConnect?.appName || "App";
      return {
        kind: "success",
        appName,
      };
    } catch (error) {
      logger.error("Failed to finish app OAuth callback", {
        safe: {},
        sensitive: { error },
      });
      return { kind: "request-failed" };
    } finally {
      await Promise.allSettled([
        hardRefetchAppsListQuery({
          appServerManager,
          queryClient,
        }),
        invalidateQueriesAndBroadcast(["mcp-settings"]),
        invalidateQueriesAndBroadcast(["mcp-settings", "app-connect"]),
      ]);
      clearPendingAppConnect({
        oauthState,
        appId,
      });
    }
  };
}

export function getAppConnectOAuthCallbackRouteState(
  value: unknown,
): AppConnectOAuthCallbackRouteState | null {
  if (value == null || typeof value !== "object") {
    return null;
  }
  const fullRedirectUrl = Reflect.get(value, "fullRedirectUrl");
  const returnTo = Reflect.get(value, "returnTo");

  if (typeof fullRedirectUrl !== "string") {
    return null;
  }
  if (returnTo != null && typeof returnTo !== "string") {
    return null;
  }
  return {
    fullRedirectUrl,
    returnTo: returnTo ?? undefined,
  };
}

function getAppConnectAppIdFromUrl(urlString: string): string | null {
  return getTrimmedSearchParamFromUrl(urlString, "appId");
}

function getOauthStateFromUrl(urlString: string): string | null {
  return getTrimmedSearchParamFromUrl(urlString, "state");
}

function getTrimmedSearchParamFromUrl(
  urlString: string,
  name: string,
): string | null {
  try {
    const url = new URL(urlString);
    const value = url.searchParams.get(name)?.trim();
    if (!value) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}
