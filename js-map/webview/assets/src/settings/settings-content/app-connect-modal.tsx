import type { components } from "@oai/sa-server-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type * as AppServer from "app-server-types";
import { useScope } from "maitai";
import type React from "react";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import {
  getAppConnectFailedMessage,
  getAppConnectedMessage,
  getAppInstallUrlMissingMessage,
  getAppConnectStartedMessage,
  getManageAppUrl,
  startAppConnect,
} from "@/apps/app-connect-actions";
import { Button } from "@/components/button";
import { ConnectorLogo } from "@/components/connector-logo";
import { Dialog } from "@/components/dialog";
import { DialogBody } from "@/components/dialog-layout";
import { Spinner } from "@/components/spinner";
import { toast$ } from "@/components/toaster/toast-signal";
import { Toggle } from "@/components/toggle";
import { useWindowType } from "@/hooks/use-window-type";
import ArrowTopRightIcon from "@/icons/arrow-top-right.svg";
import CheckCircleFilledIcon from "@/icons/check-circle-filled.svg";
import ConnectedAppsIcon from "@/icons/connected-apps.svg";
import OpenAIBlossomIcon from "@/icons/openai-blossom.svg";
import { messageBus } from "@/message-bus";
import { AppScope } from "@/scopes/app-scope";
import { logger } from "@/utils/logger";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { CodexRequest } from "@/utils/request";

type Connector = components["schemas"]["Connector-Output"];
type ConnectorTos = components["schemas"]["ConnectorTos"];
type ConnectorTosBlurb = components["schemas"]["ConnectorTosBlurb"];
type ToolPersonalizationMode = components["schemas"]["ToolPersonalizationMode"];
type PreferredAuthType = "OAUTH" | "NONE" | "UNSUPPORTED";
const PRODUCT_SKU_HEADER_KEY = "OAI-Product-Sku";
const CONNECTOR_SETTING_PRODUCT_SKU = "CONNECTOR_SETTING";
const DESCRIPTION_LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;

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

function getPreferredAuthType(connector: Connector): PreferredAuthType {
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

function getConnectorDeveloper(
  connector: Connector | undefined,
): string | null {
  const brandingDeveloper = connector?.branding?.developer?.trim();
  if (brandingDeveloper) {
    return brandingDeveloper;
  }
  const metadataDeveloper = connector?.app_metadata?.developer?.trim();
  if (metadataDeveloper) {
    return metadataDeveloper;
  }
  return null;
}

function renderDescriptionWithLinks(text: string): React.ReactNode {
  const segments: Array<React.ReactNode> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = DESCRIPTION_LINK_REGEX.exec(text)) != null) {
    if (match.index > lastIndex) {
      segments.push(text.slice(lastIndex, match.index));
    }

    const [fullMatch, label, href] = match;
    const trimmedHref = href.trim();
    if (trimmedHref.length === 0) {
      segments.push(label);
      lastIndex = match.index + fullMatch.length;
      continue;
    }

    segments.push(
      <a
        key={`${trimmedHref}-${match.index}`}
        href={trimmedHref}
        target="_blank"
        rel="noreferrer"
        className="underline"
        onClick={(event): void => {
          event.preventDefault();
          messageBus.dispatchMessage("open-in-browser", { url: trimmedHref });
        }}
      >
        {label}
      </a>,
    );
    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex));
  }

  if (segments.length === 0) {
    return text;
  }
  return segments.length === 1 ? segments[0] : segments;
}

function BlurbSkeleton(): React.ReactElement {
  return (
    <div className="rounded-2xl border border-token-border-default px-4 py-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col gap-1 border-b border-token-border-default py-2.5 last:border-none"
        >
          <div className="h-3 w-36 rounded bg-token-border-default" />
          <div className="h-2.5 w-full rounded bg-token-border-default" />
          <div className="h-2.5 w-4/5 rounded bg-token-border-default" />
        </div>
      ))}
    </div>
  );
}

function BlurbList({
  blurbs,
  personalizationToggle,
}: {
  blurbs: Array<Pick<ConnectorTosBlurb, "title" | "description">>;
  personalizationToggle?: {
    ariaLabel: string;
    blurb: Pick<ConnectorTosBlurb, "title" | "description">;
    checked: boolean;
    disabled?: boolean;
    onChange: (next: boolean) => void;
  } | null;
}): React.ReactElement {
  return (
    <div className="rounded-2xl border border-token-border-default px-4 py-2">
      {personalizationToggle != null ? (
        <div className="flex items-start justify-between gap-4 border-b border-token-border-default py-2.5 last:border-none">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-token-text-primary">
              {personalizationToggle.blurb.title}
            </div>
            <div className="text-xs text-token-text-secondary">
              {renderDescriptionWithLinks(
                personalizationToggle.blurb.description,
              )}
            </div>
          </div>
          <Toggle
            checked={personalizationToggle.checked}
            disabled={personalizationToggle.disabled}
            ariaLabel={personalizationToggle.ariaLabel}
            onChange={personalizationToggle.onChange}
          />
        </div>
      ) : null}
      {blurbs.map((blurb, index) => (
        <div
          key={`${blurb.title}-${index}`}
          className="flex flex-col gap-1 border-b border-token-border-default py-2.5 last:border-none"
        >
          <div className="text-sm font-medium text-token-text-primary">
            {blurb.title}
          </div>
          <div className="text-xs text-token-text-secondary">
            {renderDescriptionWithLinks(blurb.description)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AppConnectModal({
  app,
  isCompletingConnection = false,
  onOpenChange,
  onConnected,
  onOAuthStarted,
}: {
  app: AppServer.v2.AppInfo | null;
  isCompletingConnection?: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  onConnected?: () => Promise<void> | void;
  onOAuthStarted?: (params: {
    app: {
      id: string;
      name: string;
    };
    redirectUrl: string;
  }) => void;
}): React.ReactElement | null {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const queryClient = useQueryClient();
  const windowType = useWindowType();
  const [personalizationDraft, setPersonalizationDraft] = useState<{
    connectorId: string;
    enabled: boolean;
  } | null>(null);
  const open = app != null;
  const connectorId = app?.id ?? "";

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen) {
      setPersonalizationDraft(null);
    }
    onOpenChange(nextOpen);
  };

  const connectorQuery = useQuery({
    queryKey: ["mcp-settings", "app-connect", connectorId],
    enabled: open && app != null,
    staleTime: QUERY_STALE_TIME.FIVE_MINUTES,
    queryFn: async (): Promise<Connector> => {
      if (app == null) {
        throw new Error("Expected app metadata to be present.");
      }
      return CodexRequest.safeGet("/aip/connectors/{connector_id}", {
        parameters: {
          path: {
            connector_id: app.id,
          },
          query: {
            include_logo: false,
            include_actions: false,
          },
        },
      });
    },
  });

  const connector = connectorQuery.data;
  const connectorTosQuery = useQuery({
    queryKey: ["mcp-settings", "app-connect", "tos", connectorId],
    enabled: open && connector != null,
    staleTime: QUERY_STALE_TIME.FIVE_MINUTES,
    queryFn: async (): Promise<ConnectorTos> => {
      if (connector == null) {
        throw new Error("Expected connector metadata to be present.");
      }
      return CodexRequest.safeGet("/aip/connectors/{connector_id}/tos", {
        parameters: {
          path: {
            connector_id: connector.id,
          },
        },
        additionalHeaders: {
          [PRODUCT_SKU_HEADER_KEY]: CONNECTOR_SETTING_PRODUCT_SKU,
        },
      });
    },
  });

  const isLoadingConnector = connectorQuery.isPending;
  const preferredAuthType =
    connector == null ? "UNSUPPORTED" : getPreferredAuthType(connector);
  const requiresLinkParams =
    connector == null
      ? false
      : hasLinkParamsSchema(connector.link_params_schema);
  const shouldUseBrowserOauthFlow =
    preferredAuthType === "OAUTH" && windowType !== "electron";
  const shouldFallbackToBrowser =
    !isLoadingConnector &&
    (connectorQuery.isError ||
      connector == null ||
      requiresLinkParams ||
      preferredAuthType === "UNSUPPORTED" ||
      shouldUseBrowserOauthFlow);

  const openInstallUrlInBrowser = ({
    closeModal = true,
    showMissingUrlToast = true,
  }: { closeModal?: boolean; showMissingUrlToast?: boolean } = {}): void => {
    const nextUrl = app?.installUrl?.trim();
    if (!nextUrl) {
      if (!showMissingUrlToast) {
        return;
      }
      scope.get(toast$).danger(getAppInstallUrlMissingMessage(intl));
      return;
    }
    messageBus.dispatchMessage("open-in-browser", { url: nextUrl });
    if (closeModal) {
      handleOpenChange(false);
    }
  };
  const openManageUrlInBrowser = (): void => {
    if (app == null) {
      return;
    }

    const nextUrl = getManageAppUrl(app);
    if (!nextUrl) {
      scope.get(toast$).danger(getAppInstallUrlMissingMessage(intl));
      return;
    }

    messageBus.dispatchMessage("open-in-browser", { url: nextUrl });
    onOpenChange(false);
  };

  const connectMutation = useMutation({
    mutationFn: async () => {
      if (app == null) {
        throw new Error("Expected app metadata to be present.");
      }

      return startAppConnect({
        app: {
          id: app.id,
          installUrl: app.installUrl,
          name: app.name,
        },
        connector,
        openInBrowser: (url: string): void => {
          messageBus.dispatchMessage("open-in-browser", { url });
        },
        personalizationMode,
        queryClient,
        windowType,
      });
    },
    onSuccess: (result): void => {
      switch (result.kind) {
        case "connected-directly": {
          scope.get(toast$).success(
            getAppConnectedMessage({
              appName:
                app?.name ??
                intl.formatMessage({
                  id: "settings.mcp.appConnectModal.fallbackAppName",
                  defaultMessage: "App",
                  description:
                    "Fallback app name used in app connect success toasts",
                }),
              intl,
            }),
          );
          if (onConnected) {
            void Promise.resolve(onConnected());
          }
          handleOpenChange(false);
          return;
        }
        case "oauth-started": {
          if (app != null) {
            onOAuthStarted?.({
              app: {
                id: app.id,
                name: app.name,
              },
              redirectUrl: result.redirectUrl,
            });
          }
          scope.get(toast$).info(
            getAppConnectStartedMessage({
              intl,
              windowType,
            }),
          );
          handleOpenChange(false);
          return;
        }
        case "browser-fallback": {
          handleOpenChange(false);
          return;
        }
        case "failed": {
          scope
            .get(toast$)
            .danger(
              app?.installUrl?.trim()
                ? getAppConnectFailedMessage(intl)
                : getAppInstallUrlMissingMessage(intl),
            );
          return;
        }
      }
    },
    onError: (error): void => {
      logger.error("Failed to connect app {}", {
        safe: {
          templateArgs: [app?.id ?? "unknown"],
        },
        sensitive: {
          error,
        },
      });
      scope.get(toast$).danger(getAppConnectFailedMessage(intl));
    },
  });
  const isPrimaryActionLoading =
    connectMutation.isPending || isCompletingConnection;

  if (app == null) {
    return null;
  }

  const isConnected = app.isAccessible && !isCompletingConnection;
  const connectorName = connector?.name ?? app.name;
  const connectorDeveloper = getConnectorDeveloper(connector);
  const fallbackBlurbs: Array<
    Pick<ConnectorTosBlurb, "title" | "description">
  > = [
    {
      title: intl.formatMessage({
        id: "settings.mcp.appConnectModal.permissionsTitle",
        defaultMessage: "Permissions always respected",
        description: "Fallback permissions blurb title",
      }),
      description: intl.formatMessage({
        id: "settings.mcp.appConnectModal.permissionsDescription",
        defaultMessage:
          "ChatGPT is strictly limited to permissions you've explicitly set. Disable access anytime to revoke permissions.",
        description: "Fallback permissions blurb description",
      }),
    },
    {
      title: intl.formatMessage({
        id: "settings.mcp.appConnectModal.dataTitle",
        defaultMessage: "How ChatGPT uses data",
        description: "Fallback data usage blurb title",
      }),
      description: intl.formatMessage({
        id: "settings.mcp.appConnectModal.dataDescription",
        defaultMessage:
          "By default, we do not train on your data. Data from this connector may be used to provide you relevant and useful information.",
        description: "Fallback data usage blurb description",
      }),
    },
    {
      title: intl.formatMessage({
        id: "settings.mcp.appConnectModal.riskTitle",
        defaultMessage: "Connectors may introduce risk",
        description: "Fallback risk blurb title",
      }),
      description: intl.formatMessage({
        id: "settings.mcp.appConnectModal.riskDescription",
        defaultMessage:
          "Connectors are designed to respect your privacy, but sites may attempt to steal your data.",
        description: "Fallback risk blurb description",
      }),
    },
  ];
  const tosBlurbs = connectorTosQuery.data?.blurbs ?? [];
  const personalizationToggleBlurb =
    connectorTosQuery.data?.personalization_toggle_blurb ?? null;
  const personalizationEnabled =
    personalizationDraft?.connectorId === connectorId
      ? personalizationDraft.enabled
      : connectorTosQuery.data?.personalization_default ===
        "PERSONALIZE_ALWAYS";
  const personalizationMode: ToolPersonalizationMode | undefined =
    personalizationToggleBlurb == null
      ? undefined
      : personalizationEnabled
        ? "PERSONALIZE_ALWAYS"
        : "NO_PERSONALIZATION";
  const resolvedBlurbs = tosBlurbs.length > 0 ? tosBlurbs : fallbackBlurbs;
  const personalizationToggle =
    !isConnected &&
    !shouldFallbackToBrowser &&
    personalizationToggleBlurb != null
      ? {
          ariaLabel: intl.formatMessage(
            {
              id: "settings.mcp.appConnectModal.personalizationToggle",
              defaultMessage:
                "Allow ChatGPT to use reference memories and chats for {appName}",
              description:
                "Accessible label for the personalization toggle in the app connect modal",
            },
            { appName: connectorName },
          ),
          blurb: personalizationToggleBlurb,
          checked: personalizationEnabled,
          disabled: isPrimaryActionLoading,
          onChange: (next: boolean): void => {
            setPersonalizationDraft({
              connectorId,
              enabled: next,
            });
          },
        }
      : null;

  const handlePrimaryAction = (): void => {
    if (isLoadingConnector || isPrimaryActionLoading) {
      return;
    }
    if (isConnected) {
      openManageUrlInBrowser();
      return;
    }
    if (shouldFallbackToBrowser) {
      openInstallUrlInBrowser();
      return;
    }
    connectMutation.mutate();
  };

  const canShowAdvancedSettings =
    !isLoadingConnector &&
    !isCompletingConnection &&
    !isConnected &&
    !shouldFallbackToBrowser &&
    preferredAuthType === "OAUTH" &&
    !!app.installUrl?.trim();
  const shouldShowExternalIcon =
    isConnected ||
    (!isCompletingConnection &&
      !shouldFallbackToBrowser &&
      preferredAuthType === "OAUTH");
  const statusMessage = isCompletingConnection ? (
    <span className="flex items-center justify-center gap-2">
      <Spinner className="icon-xs" />
      <FormattedMessage
        id="settings.mcp.appConnectModal.completingConnection"
        defaultMessage="Finishing connection…"
        description="Message shown while an app connection OAuth callback is still completing in the background"
      />
    </span>
  ) : isLoadingConnector ? (
    <span className="flex items-center justify-center gap-2">
      <Spinner className="icon-xs" />
      <FormattedMessage
        id="settings.mcp.appConnectModal.loading"
        defaultMessage="Loading connection details..."
        description="Message shown while app connector details are loading in the app connect modal"
      />
    </span>
  ) : connectorQuery.isError ? (
    <FormattedMessage
      id="settings.mcp.appConnectModal.loadError"
      defaultMessage="Could not load this app's connection details. Continue in browser."
      description="Message shown when app connector details fail to load in app connect modal"
    />
  ) : requiresLinkParams ? (
    <FormattedMessage
      id="settings.mcp.appConnectModal.browserRequiredLinkParams"
      defaultMessage="This app needs extra setup fields, so connection continues in browser."
      description="Message shown when app requires link params and must connect in browser"
    />
  ) : preferredAuthType === "UNSUPPORTED" ? (
    <FormattedMessage
      id="settings.mcp.appConnectModal.browserRequiredAuth"
      defaultMessage="This app uses an auth method that currently opens in browser."
      description="Message shown when app auth type is not supported in modal flow"
    />
  ) : null;
  const primaryButtonLabel = isCompletingConnection ? (
    <FormattedMessage
      id="settings.mcp.appConnectModal.completingConnectionButton"
      defaultMessage="Finishing connection…"
      description="Primary button label shown while an app connection OAuth callback is still completing in the background"
    />
  ) : isConnected ? (
    <FormattedMessage
      id="settings.mcp.appConnectModal.manageOnChatGpt"
      defaultMessage="Manage on ChatGPT"
      description="Primary button label shown when an app is already connected and can be managed on ChatGPT"
    />
  ) : shouldFallbackToBrowser ? (
    <FormattedMessage
      id="settings.mcp.appConnectModal.openInBrowser"
      defaultMessage="Open in browser"
      description="Primary button label when app connect needs to continue in browser"
    />
  ) : preferredAuthType === "OAUTH" ? (
    <FormattedMessage
      id="settings.mcp.appConnectModal.continueToApp"
      defaultMessage="Continue to {appName}"
      description="Primary button label for OAuth connectors in app connect modal"
      values={{ appName: connectorName }}
    />
  ) : (
    <FormattedMessage
      id="settings.mcp.appConnectModal.connectToApp"
      defaultMessage="Connect {appName}"
      description="Primary button label for no-auth connectors in app connect modal"
      values={{ appName: connectorName }}
    />
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} size="wide">
      <DialogBody className="gap-6 px-6 pt-8 pb-6">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-black text-white shadow-sm">
              <OpenAIBlossomIcon className="size-12" />
            </span>
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-token-border-default" />
              <span className="size-1.5 rounded-full bg-token-border-default" />
              <span className="size-1.5 rounded-full bg-token-border-default" />
            </span>
            <span className="bg-token-surface-tertiary flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-token-border-default shadow-sm">
              <ConnectorLogo
                alt={intl.formatMessage(
                  {
                    id: "settings.mcp.appConnectModal.logoAlt",
                    defaultMessage: "{appName} logo",
                    description:
                      "Alt text for connector logo in app connect modal",
                  },
                  { appName: app.name },
                )}
                className="size-full object-contain"
                logoUrl={app.logoUrl ?? connector?.logo_url ?? null}
                logoDarkUrl={
                  app.logoUrlDark ?? connector?.logo_url_dark ?? null
                }
                fallback={
                  <ConnectedAppsIcon className="icon-sm text-token-text-secondary" />
                }
              />
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="heading-dialog font-semibold">
              <FormattedMessage
                id="settings.mcp.appConnectModal.title"
                defaultMessage="Connect {appName}"
                description="Title for the modal that connects an app from MCP settings"
                values={{ appName: connectorName }}
              />
            </div>
            {connectorDeveloper ? (
              <div className="text-sm text-token-text-secondary">
                <FormattedMessage
                  id="settings.mcp.appConnectModal.developedBy"
                  defaultMessage="Developed by {developer}"
                  description="Developer subtitle shown in app connect modal"
                  values={{ developer: connectorDeveloper }}
                />
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2 text-base text-token-charts-green">
            <CheckCircleFilledIcon className="icon-sm shrink-0" />
            <FormattedMessage
              id="settings.mcp.appConnectModal.adminApproved"
              defaultMessage="Approved by your admin"
              description="Admin approval stamp text shown in app connect modal"
            />
          </div>
        </div>

        {isLoadingConnector || connectorTosQuery.isPending ? (
          <BlurbSkeleton />
        ) : (
          <BlurbList
            blurbs={resolvedBlurbs}
            personalizationToggle={personalizationToggle}
          />
        )}

        {statusMessage ? (
          <div className="text-center text-sm text-token-description-foreground">
            {statusMessage}
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <Button
            color="primary"
            size="large"
            className="w-full justify-center"
            loading={isPrimaryActionLoading}
            disabled={isLoadingConnector || isCompletingConnection}
            onClick={handlePrimaryAction}
          >
            <span className="flex items-center gap-1">
              {primaryButtonLabel}
              {shouldShowExternalIcon ? (
                <ArrowTopRightIcon className="icon-xs" />
              ) : null}
            </span>
          </Button>
          {canShowAdvancedSettings ? (
            <Button
              color="ghost"
              size="large"
              className="w-full justify-center"
              disabled={connectMutation.isPending}
              onClick={(): void => {
                openInstallUrlInBrowser({ closeModal: true });
              }}
            >
              <FormattedMessage
                id="settings.mcp.appConnectModal.advancedSettings"
                defaultMessage="Advanced settings (opens ChatGPT.com)"
                description="Secondary action label for opening advanced connector settings"
              />
            </Button>
          ) : null}
        </div>
        {shouldFallbackToBrowser && !isLoadingConnector ? (
          <div className="text-center text-xs text-token-description-foreground">
            <FormattedMessage
              id="settings.mcp.appConnectModal.browserFallbackDescription"
              defaultMessage="This connector needs setup in your browser."
              description="Helper text shown when app connect falls back to browser flow"
            />
          </div>
        ) : null}
      </DialogBody>
    </Dialog>
  );
}
