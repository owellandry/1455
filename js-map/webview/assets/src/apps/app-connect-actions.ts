import type { components } from "@oai/sa-server-client";
import type { QueryClient, UseQueryOptions } from "@tanstack/react-query";
import type { IntlShape } from "react-intl";

import type { WindowType } from "@/hooks/use-window-type";
import { logger } from "@/utils/logger";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { CodexRequest } from "@/utils/request";
import { fetchFromVSCode } from "@/vscode-api";

type Connector = components["schemas"]["Connector-Output"];
type ToolPersonalizationMode = components["schemas"]["ToolPersonalizationMode"];
export type AppConnectPreferredAuthType = "OAUTH" | "NONE" | "UNSUPPORTED";

const PRODUCT_SKU_HEADER_KEY = "OAI-Product-Sku";
const CONNECTOR_SETTING_PRODUCT_SKU = "CONNECTOR_SETTING";
const DEFAULT_CALLBACK_ORIGIN = "https://chatgpt.com";

export type AppConnectTarget = {
  id: string;
  installUrl: string | null;
  name: string;
};

export type StartAppConnectResult =
  | {
      kind: "connected-directly";
    }
  | {
      kind: "oauth-started";
      redirectUrl: string;
    }
  | {
      kind: "browser-fallback";
    }
  | {
      kind: "failed";
    };

export type AppConnectRoute = "codex" | "chatgpt";

const APP_CONNECT_QUERY_KEY_PREFIX = ["mcp-settings", "app-connect"] as const;

export function getAppConnectConnectorQueryOptions(
  appId: string,
  {
    includeActions = false,
  }: {
    includeActions?: boolean;
  } = {},
): UseQueryOptions<Connector> {
  return {
    queryKey: [...APP_CONNECT_QUERY_KEY_PREFIX, appId, includeActions],
    staleTime: QUERY_STALE_TIME.FIVE_MINUTES,
    queryFn: async (): Promise<Connector> =>
      CodexRequest.safeGet("/aip/connectors/{connector_id}", {
        parameters: {
          path: {
            connector_id: appId,
          },
          query: {
            include_logo: false,
            include_actions: includeActions,
          },
        },
      }),
  };
}

export function getAppConnectRoute({
  app,
  connector,
  windowType,
}: {
  app: AppConnectTarget;
  connector: Connector;
  windowType?: WindowType;
}): AppConnectRoute {
  const supportsOauth = connector.supported_auth.some(
    (auth) => auth.type === "OAUTH",
  );
  const shouldUseBrowserOauthFlow =
    windowType === "browser" && supportsOauth && !!app.installUrl?.trim();
  if (shouldUseBrowserOauthFlow) {
    return "chatgpt";
  }
  return "codex";
}

export function getManageAppUrl(app: AppConnectTarget): string | null {
  const installUrl = app.installUrl?.trim();
  if (!installUrl) {
    return null;
  }

  const url = new URL(installUrl);
  url.hash = `settings/Connectors?connector=${encodeURIComponent(app.id)}&referrer=app_directory`;
  return url.toString();
}

export async function startAppConnect({
  app,
  connector,
  openInBrowser,
  personalizationMode,
  queryClient,
  windowType,
}: {
  app: AppConnectTarget;
  connector?: Connector | null;
  openInBrowser: (url: string) => void;
  personalizationMode?: ToolPersonalizationMode;
  queryClient: QueryClient;
  windowType?: WindowType;
}): Promise<StartAppConnectResult> {
  let resolvedConnector = connector;

  if (resolvedConnector == null) {
    try {
      resolvedConnector = await queryClient.fetchQuery(
        getAppConnectConnectorQueryOptions(app.id),
      );
    } catch (error) {
      logger.error("Failed to resolve app connect flow", {
        safe: { appId: app.id },
        sensitive: {
          error,
        },
      });
      return openAppInstallUrlInBrowser({
        app,
        openInBrowser,
      })
        ? { kind: "browser-fallback" }
        : { kind: "failed" };
    }
  }

  if (resolvedConnector == null) {
    return { kind: "failed" };
  }

  const preferredAuthType = getAppConnectPreferredAuthType(resolvedConnector);
  const requiresLinkParams = appConnectRequiresLinkParams(resolvedConnector);
  const shouldUseBrowserOauthFlow =
    preferredAuthType === "OAUTH" && windowType === "browser";
  if (
    requiresLinkParams ||
    preferredAuthType === "UNSUPPORTED" ||
    shouldUseBrowserOauthFlow
  ) {
    return openAppInstallUrlInBrowser({
      app,
      openInBrowser,
    })
      ? { kind: "browser-fallback" }
      : { kind: "failed" };
  }

  try {
    const toolSettings =
      personalizationMode == null
        ? undefined
        : {
            personalized: personalizationMode,
          };

    if (preferredAuthType === "NONE") {
      await CodexRequest.safePost("/aip/connectors/links/noauth", {
        requestBody: {
          connector_id: resolvedConnector.id,
          name: resolvedConnector.name,
          action_names: [],
          tool_settings: toolSettings,
        },
        additionalHeaders: {
          [PRODUCT_SKU_HEADER_KEY]: CONNECTOR_SETTING_PRODUCT_SKU,
        },
      });
      return { kind: "connected-directly" };
    }

    const callbackUrl = await getAppConnectOauthCallbackUrl({
      app,
      windowType,
    });
    const oauthResponse = await CodexRequest.safePost(
      "/aip/connectors/links/oauth",
      {
        requestBody: {
          connector_id: resolvedConnector.id,
          name: resolvedConnector.name,
          action_names: null,
          callback_url: callbackUrl,
          post_auth_url: app.installUrl ?? null,
          tool_settings: toolSettings,
        },
        additionalHeaders: {
          [PRODUCT_SKU_HEADER_KEY]: CONNECTOR_SETTING_PRODUCT_SKU,
        },
      },
    );
    const redirectUrl = oauthResponse.redirect_url?.trim();
    if (!redirectUrl) {
      throw new Error("OAuth redirect URL missing in connector response.");
    }
    openInBrowser(redirectUrl);
    return {
      kind: "oauth-started",
      redirectUrl,
    };
  } catch (error) {
    logger.error("Failed to connect app {}", {
      safe: {
        templateArgs: [app.id],
      },
      sensitive: {
        error,
      },
    });
    return openAppInstallUrlInBrowser({
      app,
      openInBrowser,
    })
      ? { kind: "browser-fallback" }
      : { kind: "failed" };
  }
}

export function getAppConnectStartedMessage({
  intl,
  windowType,
}: {
  intl: IntlShape;
  windowType?: WindowType;
}): string {
  return windowType === "browser"
    ? intl.formatMessage({
        id: "settings.mcp.appConnectModal.oauthStarted",
        defaultMessage:
          "Finish connecting in your browser, then return and refresh.",
        description:
          "Toast shown after starting OAuth from MCP settings app connect modal",
      })
    : intl.formatMessage({
        id: "settings.mcp.appConnectModal.oauthStartedElectron",
        defaultMessage: "Finish connecting in your browser.",
        description:
          "Toast shown after starting OAuth from MCP settings app connect modal in Electron",
      });
}

export function getAppConnectedMessage({
  appName,
  intl,
}: {
  appName: string;
  intl: IntlShape;
}): string {
  return intl.formatMessage(
    {
      id: "settings.mcp.appConnectModal.connected",
      defaultMessage: "{appName} is now connected.",
      description:
        "Toast shown when a no-auth app is connected directly from MCP settings",
    },
    {
      appName,
    },
  );
}

export function getAppConnectFailedMessage(intl: IntlShape): string {
  return intl.formatMessage({
    id: "settings.mcp.appConnectModal.connectFailed",
    defaultMessage: "Failed to connect app.",
    description: "Toast shown when starting an app connection fails",
  });
}

export function getAppInstallUrlMissingMessage(intl: IntlShape): string {
  return intl.formatMessage({
    id: "settings.mcp.appConnectModal.installUrlMissing",
    defaultMessage: "This app does not provide a browser setup URL right now.",
    description:
      "Toast shown when app connect fallback is attempted but no install URL is available",
  });
}

function hasLinkParamsSchema(linkParamsSchema: unknown): boolean {
  if (linkParamsSchema == null || typeof linkParamsSchema !== "object") {
    return false;
  }

  const schema = linkParamsSchema as Record<string, unknown>;
  const properties = schema.properties;
  if (properties && typeof properties === "object") {
    return Object.keys(properties as Record<string, unknown>).length > 0;
  }

  const required = schema.required;
  if (Array.isArray(required) && required.length > 0) {
    return true;
  }

  return false;
}

export function appConnectRequiresLinkParams(connector: Connector): boolean {
  return hasLinkParamsSchema(connector.link_params_schema);
}

export function getAppConnectPreferredAuthType(
  connector: Connector,
): AppConnectPreferredAuthType {
  const supportsOauth = connector.supported_auth.some(
    (auth) => auth.type === "OAUTH",
  );
  if (supportsOauth) {
    return "OAUTH";
  }

  const supportsNoAuth = connector.supported_auth.some(
    (auth) => auth.type === "NONE",
  );
  if (supportsNoAuth) {
    return "NONE";
  }

  return "UNSUPPORTED";
}

function getCallbackOrigin(installUrl: string | null): string {
  const trimmedInstallUrl = installUrl?.trim();
  if (trimmedInstallUrl) {
    try {
      return new URL(trimmedInstallUrl).origin;
    } catch {
      return DEFAULT_CALLBACK_ORIGIN;
    }
  }

  return DEFAULT_CALLBACK_ORIGIN;
}

function getPlatformOauthCallbackUrl(installUrl: string | null): string {
  return `${getCallbackOrigin(installUrl)}/connector_platform_oauth_redirect`;
}

async function getAppConnectOauthCallbackUrl({
  app,
  windowType,
}: {
  app: AppConnectTarget;
  windowType?: WindowType;
}): Promise<string> {
  if (windowType === "browser") {
    return getPlatformOauthCallbackUrl(app.installUrl);
  }
  const { callbackUrl } = await fetchFromVSCode(
    "app-connect-oauth-callback-url",
  );
  return callbackUrl;
}

function openAppInstallUrlInBrowser({
  app,
  openInBrowser,
}: {
  app: AppConnectTarget;
  openInBrowser: (url: string) => void;
}): boolean {
  const installUrl = app.installUrl?.trim();
  if (!installUrl) {
    return false;
  }

  openInBrowser(installUrl);
  return true;
}
