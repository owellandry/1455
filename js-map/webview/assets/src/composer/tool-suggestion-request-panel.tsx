import { useQueryClient } from "@tanstack/react-query";
import type * as AppServer from "app-server-types";
import { useSignal } from "maitai";
import type { ConversationId, McpRequestId } from "protocol";
import type { KeyboardEvent as ReactKeyboardEvent, ReactElement } from "react";
import { useRef, useState } from "react";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";

import { useAppServerManagerForConversationId } from "@/app-server/app-server-manager-hooks";
import {
  buildMcpServerElicitationResponse,
  type ToolSuggestionMeta,
} from "@/app-server/mcp-server-elicitation";
import { useUpdateAppEnabled } from "@/apps/apps-availability";
import { useAppConnectFlow } from "@/apps/use-app-connect-flow";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { ConnectorLogo } from "@/components/connector-logo";
import { toast$ } from "@/components/toaster/toast-signal";
import ConnectedAppsIcon from "@/icons/connected-apps.svg";
import MpcIcon from "@/icons/mcp.svg";
import { getPluginDisplayName } from "@/plugins/get-plugin-display-name";
import { PluginInstallModal } from "@/plugins/plugin-install-modal";
import { useUpdatePluginEnabled } from "@/plugins/plugins-availability";
import { usePluginInstallFlow } from "@/plugins/use-plugin-install-flow";
import type { InstalledPlugin } from "@/plugins/use-plugins";
import { usePlugins } from "@/plugins/use-plugins";
import {
  APPS_LIST_QUERY_KEY,
  useAppsListWithResolvedConnectorLogos,
} from "@/queries/apps-queries";
import { AppConnectModal } from "@/settings/settings-content/app-connect-modal";
import { logger } from "@/utils/logger";

const messages = defineMessages({
  install: {
    id: "composer.toolSuggestion.install",
    defaultMessage: "Install",
    description:
      "Primary action label for starting an MCP tool suggestion install flow",
  },
  enable: {
    id: "composer.toolSuggestion.enable",
    defaultMessage: "Enable",
    description:
      "Primary action label for enabling an MCP tool suggestion target",
  },
  notNow: {
    id: "composer.toolSuggestion.notNow",
    defaultMessage: "Not now",
    description:
      "Secondary action label for declining an MCP tool suggestion request",
  },
  escapeKey: {
    id: "composer.toolSuggestion.escapeKey",
    defaultMessage: "ESC",
    description:
      "Label for the escape key shown next to the decline action in an MCP tool suggestion request",
  },
  continue: {
    id: "composer.toolSuggestion.continue",
    defaultMessage: "Continue",
    description:
      "Tooltip label for re-checking whether an MCP tool suggestion target is ready",
  },
  connectorNotReady: {
    id: "composer.toolSuggestion.connector.notReady",
    defaultMessage:
      "{toolName} is not ready yet. Finish setting it up, then continue.",
    description:
      "Toast shown when the user asks to continue but the suggested connector is still not ready",
  },
  pluginNotReady: {
    id: "composer.toolSuggestion.plugin.notReady",
    defaultMessage:
      "{toolName} is not ready yet. Finish setting it up, then continue.",
    description:
      "Toast shown when the user asks to continue but the suggested plugin is still not ready",
  },
  missingPlugin: {
    id: "composer.toolSuggestion.plugin.missing",
    defaultMessage: "Could not load this plugin right now.",
    description:
      "Toast shown when plugin metadata cannot be loaded for an MCP tool suggestion panel",
  },
  genericLoadError: {
    id: "composer.toolSuggestion.loadError",
    defaultMessage: "Could not refresh this tool suggestion.",
    description:
      "Toast shown when the tool suggestion panel cannot refresh its backing data",
  },
});

export function ToolSuggestionRequestPanel({
  conversationId,
  requestId,
  suggestion,
}: {
  conversationId: ConversationId;
  requestId: McpRequestId;
  suggestion: ToolSuggestionMeta;
}): ReactElement {
  const appServerManager = useAppServerManagerForConversationId(conversationId);
  const intl = useIntl();
  const toast = useSignal(toast$);
  const queryClient = useQueryClient();
  const [isCheckingReady, setIsCheckingReady] = useState(false);
  const [startedSuggestedActionRequestId, setStartedSuggestedActionRequestId] =
    useState<McpRequestId | null>(null);
  const hasRespondedRef = useRef(false);
  const { data: apps = [], hardRefetchAppsList } =
    useAppsListWithResolvedConnectorLogos();
  const {
    plugins,
    refetch: refetchPlugins,
    forceReload: forceReloadPlugins,
  } = usePlugins(undefined, {
    // Connector suggestions only need app readiness. Skip plugin/list entirely
    // unless the suggestion itself targets a plugin.
    enabled: suggestion.tool_type === "plugin",
  });
  const {
    clearConnectingApp,
    connectingApp,
    handleAppConnectOAuthStarted,
    handleConnectApp,
    handleOpenAppUrl,
    isAppConnectPending,
  } = useAppConnectFlow();
  const { setAppEnabled, updatingAppId } = useUpdateAppEnabled();
  const { pendingPluginId, setPluginEnabled } = useUpdatePluginEnabled();
  const {
    closePluginInstall,
    connectRequiredApp,
    installPlugin,
    isInstalling: isInstallingPlugin,
    openPluginInstall,
    session: pluginInstallSession,
  } = usePluginInstallFlow({
    apps,
    forceReloadPlugins,
    hardRefetchAppsList,
  });
  const connectorSuggestion =
    suggestion.tool_type === "connector" ? suggestion : null;
  const pluginSuggestion =
    suggestion.tool_type === "plugin" ? suggestion : null;
  const matchingApp =
    connectorSuggestion == null
      ? null
      : (apps.find((app) => {
          return app.id === connectorSuggestion.tool_id;
        }) ?? null);
  const matchingPlugin =
    pluginSuggestion == null
      ? null
      : (plugins.find((plugin) => {
          return plugin.plugin.id === pluginSuggestion.tool_id;
        }) ?? null);
  const isReady = getIsToolSuggestionReady({
    app: matchingApp,
    plugin: matchingPlugin,
    suggestion,
  });
  const isInstallingApp =
    connectingApp?.id === suggestion.tool_id ||
    isAppConnectPending(suggestion.tool_id);
  const isSuggestedPluginInstallFlowOpen =
    pluginInstallSession.kind !== "closed" &&
    pluginInstallSession.plugin.plugin.id === suggestion.tool_id;
  const hasStartedSuggestedAction =
    startedSuggestedActionRequestId === requestId;
  const isSuggestedActionInProgress =
    suggestion.tool_type === "connector"
      ? suggestion.suggest_type === "install"
        ? isInstallingApp
        : updatingAppId === suggestion.tool_id
      : suggestion.suggest_type === "install"
        ? isSuggestedPluginInstallFlowOpen
        : pendingPluginId === suggestion.tool_id;
  const shouldShowContinue =
    !isSuggestedActionInProgress && (isReady || hasStartedSuggestedAction);
  const primaryActionMessage = shouldShowContinue
    ? messages.continue
    : suggestion.suggest_type === "install"
      ? messages.install
      : messages.enable;
  const isPrimaryActionLoading = shouldShowContinue
    ? isCheckingReady
    : isSuggestedActionInProgress;
  const suggestionTitle =
    suggestion.tool_type === "plugin"
      ? matchingPlugin == null
        ? suggestion.tool_name
        : getPluginDisplayName(matchingPlugin)
      : suggestion.tool_name;
  const suggestionDescription =
    suggestion.tool_type === "plugin"
      ? (matchingPlugin?.description ?? null)
      : (matchingApp?.description ?? null);
  const suggestionIcon =
    suggestion.tool_type === "plugin" ? (
      <ConnectorLogo
        alt={suggestion.tool_name}
        className="icon-sm rounded-sm object-contain"
        logoUrl={matchingPlugin?.logoPath ?? null}
        fallback={<MpcIcon className="icon-sm text-token-text-secondary" />}
      />
    ) : (
      <ConnectorLogo
        alt={suggestion.tool_name}
        className="icon-sm rounded-sm object-contain"
        logoUrl={matchingApp?.logoUrl ?? null}
        logoDarkUrl={matchingApp?.logoUrlDark ?? null}
        fallback={
          <ConnectedAppsIcon className="icon-sm text-token-text-secondary" />
        }
      />
    );

  const replyWithAction = (
    action: AppServer.v2.McpServerElicitationRequestResponse["action"],
  ): void => {
    if (hasRespondedRef.current) {
      return;
    }

    hasRespondedRef.current = true;
    appServerManager.replyWithMcpServerElicitationResponse(
      conversationId,
      requestId,
      buildMcpServerElicitationResponse(action),
    );
  };

  const handleDecline = (): void => {
    replyWithAction("decline");
  };

  const handlePrimaryActionKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ): void => {
    if (event.key !== "Escape") {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    handleDecline();
  };

  const handleInstallApp = async (): Promise<void> => {
    setStartedSuggestedActionRequestId(requestId);
    if (matchingApp != null) {
      await handleConnectApp(matchingApp);
      return;
    }
    if (connectorSuggestion == null) {
      return;
    }
    handleOpenAppUrl(connectorSuggestion.install_url);
  };

  const handleInstallPlugin = (): void => {
    if (matchingPlugin == null) {
      toast.danger(intl.formatMessage(messages.missingPlugin));
      return;
    }

    setStartedSuggestedActionRequestId(requestId);
    openPluginInstall(matchingPlugin);
  };

  const handleSetSuggestedToolEnabled = async ({
    enabled,
    setEnabled,
  }: {
    enabled: boolean;
    setEnabled: () => Promise<unknown>;
  }): Promise<void> => {
    if (enabled) {
      setStartedSuggestedActionRequestId(requestId);
    }

    try {
      await setEnabled();
    } catch {
      return;
    }
  };

  const handleSetAppEnabled = ({
    appId,
    enabled,
  }: {
    appId: string;
    enabled: boolean;
  }): Promise<void> => {
    return handleSetSuggestedToolEnabled({
      enabled,
      setEnabled: () =>
        setAppEnabled({
          appId,
          enabled,
        }),
    });
  };

  const handleSetPluginEnabled = ({
    pluginDisplayName,
    pluginId,
    enabled,
  }: {
    pluginDisplayName: string;
    pluginId: string;
    enabled: boolean;
  }): Promise<void> => {
    return handleSetSuggestedToolEnabled({
      enabled,
      setEnabled: () =>
        setPluginEnabled({
          pluginDisplayName,
          pluginId,
          enabled,
        }),
    });
  };

  const handleContinue = async (): Promise<void> => {
    setIsCheckingReady(true);
    try {
      if (suggestion.tool_type === "connector") {
        await hardRefetchAppsList();
        const nextApps =
          queryClient.getQueryData<Array<AppServer.v2.AppInfo>>(
            APPS_LIST_QUERY_KEY,
          ) ?? [];
        const nextApp =
          nextApps.find((app) => {
            return app.id === suggestion.tool_id;
          }) ?? null;
        if (
          !getIsToolSuggestionReady({
            app: nextApp,
            plugin: null,
            suggestion,
          })
        ) {
          toast.danger(
            intl.formatMessage(messages.connectorNotReady, {
              toolName: suggestion.tool_name,
            }),
          );
          return;
        }
        replyWithAction("accept");
        return;
      }

      const nextPlugins = await refetchPlugins();
      const nextPlugin =
        nextPlugins.find((plugin) => {
          return plugin.plugin.id === suggestion.tool_id;
        }) ?? null;
      if (
        !getIsToolSuggestionReady({
          app: null,
          plugin: nextPlugin,
          suggestion,
        })
      ) {
        toast.danger(
          intl.formatMessage(messages.pluginNotReady, {
            toolName: suggestion.tool_name,
          }),
        );
        return;
      }
      replyWithAction("accept");
    } catch (error) {
      logger.error("Failed to refresh tool suggestion readiness", {
        safe: { toolId: suggestion.tool_id, toolType: suggestion.tool_type },
        sensitive: { error },
      });
      toast.danger(intl.formatMessage(messages.genericLoadError));
    } finally {
      setIsCheckingReady(false);
    }
  };

  const handlePrimaryAction = async (): Promise<void> => {
    if (shouldShowContinue) {
      await handleContinue();
      return;
    }

    if (suggestion.tool_type === "connector") {
      if (suggestion.suggest_type === "install") {
        await handleInstallApp();
        return;
      }

      if (matchingApp == null) {
        await handleContinue();
        return;
      }

      await handleSetAppEnabled({
        appId: matchingApp.id,
        enabled: true,
      });
      return;
    }

    if (suggestion.suggest_type === "install") {
      handleInstallPlugin();
      return;
    }

    if (matchingPlugin == null) {
      toast.danger(intl.formatMessage(messages.missingPlugin));
      return;
    }

    await handleSetPluginEnabled({
      pluginDisplayName: getPluginDisplayName(matchingPlugin),
      pluginId: matchingPlugin.plugin.id,
      enabled: true,
    });
  };

  return (
    <>
      <div className="text-size-chat flex flex-col overflow-hidden rounded-3xl border border-token-border bg-token-input-background text-token-foreground shadow-sm">
        <div className="flex flex-col gap-4 px-5 pt-5 pb-5">
          <div className="flex items-center gap-2 text-token-description-foreground">
            {suggestionIcon}
            <span>{suggestionTitle}</span>
          </div>
          <div className="text-base leading-6">{suggestion.suggest_reason}</div>
          {suggestionDescription != null ? (
            <div className="text-sm leading-5 text-token-description-foreground">
              {suggestionDescription}
            </div>
          ) : null}
        </div>
        <form
          className="flex items-center justify-end gap-2 border-t border-token-border/70 px-4 py-4"
          onSubmit={(event): void => {
            event.preventDefault();
            void handlePrimaryAction();
          }}
        >
          <Button
            color="outline"
            size="medium"
            type="button"
            onClick={handleDecline}
          >
            <span>
              <FormattedMessage {...messages.notNow} />
            </span>
            <span className="ml-0.5 pt-0.5 text-xs text-token-description-foreground/70">
              <FormattedMessage {...messages.escapeKey} />
            </span>
          </Button>
          <Button
            autoFocus
            color="primary"
            size="medium"
            type="submit"
            loading={isPrimaryActionLoading}
            onKeyDown={handlePrimaryActionKeyDown}
          >
            <span>
              <FormattedMessage {...primaryActionMessage} />
            </span>
            <Badge
              aria-hidden
              className="bg-token-dropdown-background/15 !px-1.5 !py-[1px] text-sm leading-none text-token-dropdown-background"
            >
              <span className="font-mono">
                {/* oxlint-disable-next-line formatjs/no-literal-string-in-jsx */}
                {"\u23CE"}
              </span>
            </Badge>
          </Button>
        </form>
      </div>
      <PluginInstallModal
        isInstalling={isInstallingPlugin}
        onConnectRequiredApp={connectRequiredApp}
        onInstall={installPlugin}
        onOpenChange={(nextOpen): void => {
          if (!nextOpen) {
            closePluginInstall();
          }
        }}
        session={pluginInstallSession}
      />
      <AppConnectModal
        app={connectingApp}
        onOpenChange={(nextOpen): void => {
          if (!nextOpen) {
            clearConnectingApp();
          }
        }}
        onConnected={async (): Promise<void> => {
          await hardRefetchAppsList();
        }}
        onOAuthStarted={handleAppConnectOAuthStarted}
      />
    </>
  );
}

function getIsToolSuggestionReady({
  app,
  plugin,
  suggestion,
}: {
  app: AppServer.v2.AppInfo | null;
  plugin: InstalledPlugin | null;
  suggestion: ToolSuggestionMeta;
}): boolean {
  switch (suggestion.tool_type) {
    case "connector": {
      if (app?.isAccessible !== true) {
        return false;
      }
      if (suggestion.suggest_type === "install") {
        return true;
      }
      return app.isEnabled;
    }
    case "plugin": {
      if (plugin?.plugin.installed !== true) {
        return false;
      }
      if (suggestion.suggest_type === "install") {
        return true;
      }
      return plugin.plugin.enabled;
    }
  }
}
