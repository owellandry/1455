import { useScope } from "maitai";
import { LOCAL_CONVERSATION_ROUTE_PATTERN } from "protocol";
import type React from "react";
import { useEffect, useEffectEvent, useRef } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { matchPath, useLocation, useNavigate } from "react-router";

import {
  getAppConnectOAuthCallbackRouteState,
  useAppConnectOAuthState,
  useCompleteAppConnectOAuthCallback,
} from "@/apps/app-connect-oauth";
import { Spinner } from "@/components/spinner";
import { toast$ } from "@/components/toaster/toast-signal";
import { useWindowType } from "@/hooks/use-window-type";
import { AppScope } from "@/scopes/app-scope";

export function AppConnectOAuthCallbackPage(): React.ReactElement {
  const intl = useIntl();
  const navigate = useNavigate();
  const location = useLocation();
  const windowType = useWindowType();
  const scope = useScope(AppScope);
  const completeAppConnectOAuthCallback = useCompleteAppConnectOAuthCallback();
  const { getPendingAppConnectForCallbackUrl } = useAppConnectOAuthState();
  const lastProcessedLocationKey = useRef<string | null>(null);
  const runCallbackEvent = useEffectEvent(
    ({
      appId,
      appName,
      fullRedirectUrl,
      shouldShowPendingToast,
    }: {
      appId?: string;
      appName?: string;
      fullRedirectUrl: string | null;
      shouldShowPendingToast: boolean;
    }): void => {
      const toastId = getAppConnectCallbackToastId(appId);

      if (
        shouldShowPendingToast &&
        fullRedirectUrl != null &&
        fullRedirectUrl.length > 0
      ) {
        scope.get(toast$).info(
          <span className="loading-shimmer-pure-text">
            <FormattedMessage
              id="apps.appConnectOAuthCallbackPage.pending"
              defaultMessage="Finishing {connector} setup"
              description="Toast shown when an app OAuth callback has returned and Codex is finishing setup"
              values={{
                connector:
                  appName ??
                  intl.formatMessage({
                    id: "apps.appConnectOAuthCallbackPage.fallbackAppName",
                    defaultMessage: "App",
                    description:
                      "Fallback app name used in app connect callback pending toasts",
                  }),
              }}
            />
          </span>,
          {
            duration: 0,
            id: toastId,
          },
        );
      }

      void completeAppConnectOAuthCallback({
        fullRedirectUrl: fullRedirectUrl ?? "",
      }).then((result) => {
        switch (result.kind) {
          case "missing-callback-data": {
            scope
              .get(toast$)
              .danger(
                <FormattedMessage
                  id="apps.appConnectOAuthCallbackPage.missingData"
                  defaultMessage="Missing OAuth callback data."
                  description="Toast shown when an app connection OAuth callback is missing the redirect URL"
                />,
                {
                  id: toastId,
                },
              );
            break;
          }
          case "request-failed": {
            scope
              .get(toast$)
              .danger(
                <FormattedMessage
                  id="apps.appConnectOAuthCallbackPage.requestFailed"
                  defaultMessage="Failed to finish connecting app."
                  description="Toast shown when finishing an app connection OAuth callback fails"
                />,
                {
                  id: toastId,
                },
              );
            break;
          }
          case "success": {
            scope.get(toast$).success(
              <FormattedMessage
                id="apps.appConnectOAuthCallbackPage.success"
                defaultMessage="{appName} is now connected."
                description="Toast shown when an app connection OAuth callback succeeds"
                values={{
                  appName: result.appName,
                }}
              />,
              {
                id: toastId,
              },
            );
            break;
          }
        }
      });
    },
  );

  useEffect(() => {
    if (lastProcessedLocationKey.current === location.key) {
      return;
    }
    lastProcessedLocationKey.current = location.key;

    const routeState = getAppConnectOAuthCallbackRouteState(location.state);
    const fullRedirectUrl = routeState?.fullRedirectUrl?.trim();
    const pendingAppConnect =
      fullRedirectUrl != null && fullRedirectUrl.length > 0
        ? getPendingAppConnectForCallbackUrl(fullRedirectUrl)
        : null;
    const resumePath =
      pendingAppConnect?.returnTo ??
      routeState?.returnTo ??
      (windowType === "extension" ? "/settings/plugins-settings" : "/skills");

    runCallbackEvent({
      appId: pendingAppConnect?.appId,
      appName: pendingAppConnect?.appName,
      fullRedirectUrl: fullRedirectUrl ?? null,
      shouldShowPendingToast:
        pendingAppConnect?.resumeTarget.kind === "plugin-install",
    });
    if (matchPath(LOCAL_CONVERSATION_ROUTE_PATTERN, resumePath) != null) {
      void navigate(resumePath, {
        replace: true,
      });
      return;
    }

    switch (pendingAppConnect?.resumeTarget.kind) {
      case "plugin-install": {
        void navigate(resumePath, {
          replace: true,
          state: {
            initialTab: "plugins",
          },
        });
        return;
      }
      case "apps-tab":
      case undefined: {
        void navigate(resumePath, {
          replace: true,
          state: {
            connectAppId: pendingAppConnect?.appId,
            initialTab: "apps",
          },
        });
        return;
      }
    }
  }, [
    getPendingAppConnectForCallbackUrl,
    intl,
    location.key,
    location.state,
    navigate,
    windowType,
  ]);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <Spinner className="icon-sm" />
    </div>
  );
}

function getAppConnectCallbackToastId(appId?: string): string {
  return appId == null
    ? "app-connect-oauth-callback"
    : `app-connect-oauth-callback-${appId}`;
}
