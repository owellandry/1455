import { useQueryClient } from "@tanstack/react-query";
import type * as AppServer from "app-server-types";
import type { ReactElement } from "react";
import { useState } from "react";
import { defineMessages, FormattedMessage } from "react-intl";
import { Navigate, useLocation, useNavigate } from "react-router";

import { useUpdateAppEnabled } from "@/apps/apps-availability";
import { useAppConnectFlow } from "@/apps/use-app-connect-flow";
import { AppHeader } from "@/components/app/app-header";
import { Button } from "@/components/button";
import { Tooltip } from "@/components/tooltip";
import { WithWindow } from "@/components/with-window";
import {
  getAppMentionPath,
  getPluginMentionPath,
} from "@/composer/mention-item";
import { escapePromptLinkPath } from "@/composer/prosemirror/prompt-link-path";
import { useIsPluginsEnabled } from "@/hooks/use-is-plugins-enabled";
import { useStartNewConversation } from "@/hooks/use-start-new-conversation";
import ChatsIcon from "@/icons/chats.svg";
import ChevronRightIcon from "@/icons/chevron-right.svg";
import {
  useAppsListWithResolvedConnectorLogos,
  useAppTools,
} from "@/queries/apps-queries";
import {
  MCP_SERVERS_QUERY_KEY,
  useMcpServers,
  useUpdateMcpServerEnabled,
} from "@/queries/config-queries";
import { useInvalidateQueriesAndBroadcast } from "@/queries/invalidate-queries-and-broadcast";
import {
  PLUGIN_DETAIL_QUERY_KEY,
  usePluginDetail,
} from "@/queries/plugin-detail-queries";
import { AppConnectModal } from "@/settings/settings-content/app-connect-modal";
import { AppToolsDialog } from "@/skills/app-tools-dialog";
import { useInstalledSkillsData } from "@/skills/use-skills-page-data";
import type { McpServers } from "@/types/mcp";
import { useFetchFromVSCode } from "@/vscode-api";

import {
  buildPluginDetailApps,
  buildPluginDetailSkills,
} from "./plugin-detail-page-utils";
import { getPluginDetailRouteParams } from "./plugin-detail-route-utils";
import { PluginDetailView } from "./plugin-detail-view";
import { PluginInstallModal } from "./plugin-install-modal";
import { PluginUninstallDialog } from "./plugin-uninstall-dialog";
import {
  useUninstallPlugin,
  useUpdatePluginEnabled,
} from "./plugins-availability";
import {
  type PluginInstallBlockedReason,
  usePluginDisabledByAdmin,
} from "./use-plugin-disabled-by-admin";
import { usePluginInstallFlow } from "./use-plugin-install-flow";
import {
  createInstalledPluginFromPluginDetail,
  PLUGINS_QUERY_KEY,
} from "./use-plugins";

const messages = defineMessages({
  pageTitleFallback: {
    id: "plugins.detail.pageTitleFallback",
    defaultMessage: "Plugin",
    description: "Fallback plugin title on the plugin detail page",
  },
  pluginsRoot: {
    id: "plugins.detail.breadcrumb.root",
    defaultMessage: "Plugins",
    description: "Back button label on the plugin detail page",
  },
  manageRoot: {
    id: "plugins.detail.breadcrumb.manage",
    defaultMessage: "Manage",
    description:
      "Back button label on the plugin detail page when opened from manage",
  },
  addToCodex: {
    id: "plugins.detail.addToCodex",
    defaultMessage: "Add to Codex",
    description: "Primary install action on the plugin detail page",
  },
  addingToCodex: {
    id: "plugins.detail.addingToCodex",
    defaultMessage: "Adding to Codex",
    description:
      "Primary install action on the plugin detail page while installation is in progress",
  },
  disabledByAdmin: {
    id: "plugins.install.disabledByAdmin",
    defaultMessage: "Disabled by admin",
    description:
      "Tooltip shown when plugin install is unavailable because all included connectors are disabled by admin",
  },
  connectorUnavailable: {
    id: "plugins.install.connectorUnavailable",
    defaultMessage: "App unavailable",
    description:
      "Tooltip shown when plugin install is unavailable because the plugin's apps are not available in the current app directory",
  },
  uninstall: {
    id: "plugins.detail.uninstall",
    defaultMessage: "Remove from Codex",
    description: "Remove action on the plugin detail page",
  },
  enableInCodex: {
    id: "plugins.detail.enableInCodex",
    defaultMessage: "Enable in Codex",
    description: "Enable action on the plugin detail page",
  },
  tryInCodex: {
    id: "plugins.detail.tryInCodex",
    defaultMessage: "Try in chat",
    description: "Try action on the plugin detail page",
  },
});

export function PluginDetailPage({
  pluginName: pluginNameProp,
  marketplacePath: marketplacePathProp,
  onBack,
  onBeforeOpenInstall,
}: {
  pluginName?: string | null;
  marketplacePath?: string | null;
  onBack?: () => void;
  onBeforeOpenInstall?: () => void;
} = {}): ReactElement {
  const isPluginsEnabled = useIsPluginsEnabled();
  const location = useLocation();
  const navigate = useNavigate();
  const startNewConversation = useStartNewConversation();
  const invalidateQueriesAndBroadcast = useInvalidateQueriesAndBroadcast();
  const [isUninstallDialogOpen, setIsUninstallDialogOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const routeParams = getPluginDetailRouteParams(location.search);
  const marketplacePath =
    marketplacePathProp ?? routeParams?.marketplacePath ?? null;
  const pluginName = pluginNameProp ?? routeParams?.pluginName ?? null;
  const { data: activeWorkspaceRoot } = useFetchFromVSCode(
    "active-workspace-roots",
    {
      select: (data) => data.roots[0] ?? null,
    },
  );
  const queryClient = useQueryClient();
  const { data: directoryApps = [], hardRefetchAppsList } =
    useAppsListWithResolvedConnectorLogos();
  const { data: mcpServersConfig } = useMcpServers(null);
  const {
    markSkillsUpdated,
    skills: installedSkills,
    workspaceRoots,
  } = useInstalledSkillsData();
  const {
    closePluginInstall,
    connectRequiredApp,
    installPlugin,
    isInstalling,
    openPluginInstall,
    session: pluginInstallSession,
  } = usePluginInstallFlow({
    apps: directoryApps,
    forceReloadPlugins: async (): Promise<void> => {
      await refreshPluginData({
        invalidateQueriesAndBroadcast,
        marketplacePath,
        pluginName,
      });
    },
    hardRefetchAppsList,
  });
  const {
    errorMessage,
    isLoading,
    plugin,
    refetch: refetchPluginDetail,
  } = usePluginDetail({
    marketplacePath,
    pluginName,
  });
  const { setAppEnabled, updatingAppId } = useUpdateAppEnabled();
  const selectedAppForTools =
    selectedAppId == null
      ? null
      : (directoryApps.find((app) => {
          return app.id === selectedAppId;
        }) ?? null);
  const selectedAppToolsQuery = useAppTools(selectedAppId);
  const updateMcpServerEnabled = useUpdateMcpServerEnabled();
  const { pendingPluginId, setPluginEnabled } = useUpdatePluginEnabled();
  const { pendingUninstallPluginId, uninstallPlugin } = useUninstallPlugin();
  const {
    blockedReasonsByConnectorId: appInstallBlockedReasonsById,
    blockedReason: installBlockedReason,
    isLoading: isPluginInstallBlockedLoading,
  } = usePluginDisabledByAdmin(
    plugin == null || plugin.summary.installed
      ? {}
      : {
          pluginApps: plugin.apps,
        },
  );
  const isPluginInstallBlocked = installBlockedReason != null;
  const {
    clearConnectingApp,
    connectingApp,
    handleAppConnectOAuthStarted,
    handleConnectApp,
    handleOpenAppUrl,
    isAppConnectPending,
  } = useAppConnectFlow();

  if (!isPluginsEnabled) {
    return <Navigate replace to="/skills" />;
  }

  const pageTitle =
    plugin == null ? (
      <FormattedMessage {...messages.pageTitleFallback} />
    ) : (
      getPluginDetailPageTitle(plugin)
    );
  const includedApps =
    plugin == null
      ? []
      : buildPluginDetailApps({
          directoryApps,
          pluginApps: plugin.apps,
        });
  const includedSkills =
    plugin == null
      ? { installedSkills: [], unavailableSkills: [] }
      : buildPluginDetailSkills({
          installedSkills,
          pluginSkills: plugin.skills,
        });
  const includedMcpServers =
    plugin == null
      ? []
      : buildPluginDetailMcpServers({
          apps: directoryApps,
          configuredServers: mcpServersConfig?.servers ?? {},
          pluginServerNames: plugin.mcpServers,
        });
  const isUninstalling =
    plugin != null && pendingUninstallPluginId === plugin.summary.id;
  const isUpdatingEnabled =
    plugin != null && pendingPluginId === plugin.summary.id;
  const isInstallBlocked =
    isPluginInstallBlocked || isPluginInstallBlockedLoading;

  const viewState = getPluginDetailViewState({
    errorMessage,
    isLoading,
    marketplacePath,
    plugin,
    pluginName,
  });
  const isManageSource = routeParams?.source === "manage";
  const historyIndex =
    typeof window === "undefined"
      ? 0
      : ((window.history.state as { idx?: number } | null)?.idx ?? 0);
  const handleBack = (): void => {
    if (onBack != null) {
      onBack();
      return;
    }

    if (isManageSource) {
      void navigate("/skills", {
        state: {
          initialMode: "manage",
          initialTab: "plugins",
        },
      });
      return;
    }

    if (historyIndex > 0) {
      void navigate(-1);
      return;
    }

    void navigate("/skills", {
      state: {
        initialTab: "plugins",
      },
    });
  };

  // Opening the install flow is synchronous; we intentionally stop the prompt
  // activation here until the user completes install separately.
  const handleInstall = (plugin: AppServer.v2.PluginDetail): void => {
    onBeforeOpenInstall?.();
    openPluginInstall(createInstalledPluginFromPluginDetail(plugin));
  };

  const handleUninstall = async (
    plugin: AppServer.v2.PluginDetail,
  ): Promise<void> => {
    try {
      await uninstallPlugin({
        pluginDisplayName: getPluginDetailPageTitle(plugin),
        pluginId: plugin.summary.id,
      });
      await refreshPluginData({
        invalidateQueriesAndBroadcast,
        marketplacePath,
        pluginName,
        refetchPluginDetail,
      });
    } finally {
      setIsUninstallDialogOpen(false);
    }
  };

  const handleEnable = async (
    plugin: AppServer.v2.PluginDetail,
  ): Promise<void> => {
    await setPluginEnabled({
      enabled: true,
      pluginDisplayName: getPluginDetailPageTitle(plugin),
      pluginId: plugin.summary.id,
    });
    await refreshPluginData({
      invalidateQueriesAndBroadcast,
      marketplacePath,
      pluginName,
      refetchPluginDetail,
    });
  };

  const startConversationWithPrompt = (
    plugin: AppServer.v2.PluginDetail,
    defaultPrompt: string | null,
  ): void => {
    startNewConversation(
      {
        prefillPrompt: getPluginPrefillPrompt({
          defaultPrompt,
          plugin,
        }),
        prefillCwd:
          activeWorkspaceRoot != null && activeWorkspaceRoot !== "/"
            ? activeWorkspaceRoot
            : undefined,
      },
      { startInSidebar: true },
    );
  };

  const tryEnsurePluginReadyForPrompt = async (
    plugin: AppServer.v2.PluginDetail,
  ): Promise<boolean> => {
    if (!plugin.summary.installed) {
      if (isInstallBlocked) {
        return false;
      }
      handleInstall(plugin);
      return false;
    }
    if (!plugin.summary.enabled) {
      try {
        await handleEnable(plugin);
      } catch {
        return false;
      }
    }
    return true;
  };

  const handleActivatePrompt = (
    plugin: AppServer.v2.PluginDetail,
    defaultPrompt: string | null,
  ): void => {
    void (async (): Promise<void> => {
      const isPluginReady = await tryEnsurePluginReadyForPrompt(plugin);
      if (!isPluginReady) {
        return;
      }
      startConversationWithPrompt(plugin, defaultPrompt);
    })();
  };
  const handleToggleMcpServerEnabled = async (
    serverName: string,
    nextEnabled: boolean,
  ): Promise<void> => {
    await updateMcpServerEnabled.mutateAsync({
      key: serverName,
      enabled: nextEnabled,
    });
    await queryClient.invalidateQueries({
      queryKey: MCP_SERVERS_QUERY_KEY,
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col text-base">
      <WithWindow extension={onBack != null} electron browser>
        <AppHeader hideDivider>
          <div className="draggable grid w-full min-w-0 items-center gap-2 md:grid-cols-[1fr_auto] electron:h-toolbar browser:h-toolbar extension:py-row-y">
            <div className="-ml-2 min-w-0 text-base">
              <div className="flex min-w-0 items-center gap-1 text-token-description-foreground">
                <Button color="ghost" size="toolbar" onClick={handleBack}>
                  <FormattedMessage
                    {...(isManageSource
                      ? messages.manageRoot
                      : messages.pluginsRoot)}
                  />
                </Button>
                <ChevronRightIcon className="icon-xs shrink-0" />
                <Button
                  color="ghost"
                  size="toolbar"
                  className="pointer-events-none min-w-0 bg-transparent text-token-foreground hover:bg-transparent"
                >
                  <span className="min-w-0 truncate text-token-foreground">
                    {pageTitle}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </AppHeader>
      </WithWindow>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {viewState === "ready" && plugin != null ? (
          <PluginDetailView
            actions={
              <PluginDetailActions
                blockedReason={installBlockedReason}
                isInstallBlocked={isPluginInstallBlocked}
                isInstallBlockedLoading={isPluginInstallBlockedLoading}
                isInstalling={isInstalling}
                isUninstalling={isUninstalling}
                isUpdatingEnabled={isUpdatingEnabled}
                placement="content"
                plugin={plugin}
                onInstall={(): void => {
                  handleActivatePrompt(plugin, null);
                }}
                onEnable={(): void => {
                  void handleEnable(plugin);
                }}
                onTryInChat={(): void => {
                  handleActivatePrompt(
                    plugin,
                    getPrimaryPluginDefaultPrompt(plugin),
                  );
                }}
                onUninstall={(): void => {
                  setIsUninstallDialogOpen(true);
                }}
              />
            }
            apps={includedApps}
            appInstallBlockedReasonsById={appInstallBlockedReasonsById}
            installedSkills={includedSkills.installedSkills}
            installBlockedReason={installBlockedReason}
            isPromptInstallBlocked={isInstallBlocked}
            isAppConnectPending={isAppConnectPending}
            updatingAppId={updatingAppId}
            isUpdatingEnabled={isUpdatingEnabled}
            isUninstalling={isUninstalling}
            onActivatePrompt={(defaultPrompt): void => {
              handleActivatePrompt(plugin, defaultPrompt);
            }}
            onInstallApp={async (app): Promise<void> => {
              await handleConnectApp(app);
            }}
            onOpenAppTools={(app): void => {
              setSelectedAppId(app.id);
            }}
            onOpenAppUrl={handleOpenAppUrl}
            onSetAppEnabled={setAppEnabled}
            onSkillsUpdated={markSkillsUpdated}
            mcpServers={includedMcpServers}
            onOpenMcpSettings={() => {
              void navigate("/settings/mcp-settings");
            }}
            onToggleMcpServerEnabled={(serverName, nextEnabled) => {
              void handleToggleMcpServerEnabled(serverName, nextEnabled);
            }}
            plugin={plugin}
            state="ready"
            unavailableSkills={includedSkills.unavailableSkills}
            workspaceRoots={workspaceRoots}
          />
        ) : viewState === "error" ? (
          <PluginDetailView errorMessage={errorMessage} state="error" />
        ) : viewState === "loading" ? (
          <PluginDetailView state="loading" />
        ) : (
          <PluginDetailView state="missing" />
        )}
      </div>
      <WithWindow extension={onBack != null} electron browser>
        <PluginInstallModal
          isInstalling={isInstalling}
          onConnectRequiredApp={connectRequiredApp}
          onInstall={installPlugin}
          onOpenChange={(nextOpen): void => {
            if (!nextOpen) {
              closePluginInstall();
            }
          }}
          session={pluginInstallSession}
        />
      </WithWindow>
      <AppConnectModal
        app={connectingApp}
        onOpenChange={(nextOpen): void => {
          if (!nextOpen) {
            clearConnectingApp();
          }
        }}
        onOAuthStarted={handleAppConnectOAuthStarted}
        onConnected={async (): Promise<void> => {
          await Promise.all([
            hardRefetchAppsList(),
            refreshPluginData({
              invalidateQueriesAndBroadcast,
              marketplacePath,
              pluginName,
              refetchPluginDetail,
            }),
          ]);
        }}
      />
      <AppToolsDialog
        app={selectedAppForTools}
        errorMessage={selectedAppToolsQuery.error?.message ?? null}
        isLoading={selectedAppToolsQuery.isLoading}
        onOpenChange={(nextOpen): void => {
          if (!nextOpen) {
            setSelectedAppId(null);
          }
        }}
        onOpenAppUrl={handleOpenAppUrl}
        onSetAppEnabled={setAppEnabled}
        showEnableToggle={plugin?.summary.installed === true}
        onTryInChat={(app): void => {
          startNewConversation(
            {
              prefillPrompt: `[@${app.name}](${escapePromptLinkPath(
                getAppMentionPath(app.id),
              )})`,
              prefillCwd:
                activeWorkspaceRoot != null && activeWorkspaceRoot !== "/"
                  ? activeWorkspaceRoot
                  : undefined,
            },
            { startInSidebar: true },
          );
        }}
        tools={selectedAppToolsQuery.data ?? []}
        updatingAppId={updatingAppId}
      />
      {plugin != null ? (
        <PluginUninstallDialog
          dialogMode="detail"
          isDisabling={isUpdatingEnabled}
          isUninstalling={isUninstalling}
          open={isUninstallDialogOpen}
          pluginDisplayName={getPluginDetailPageTitle(plugin)}
          onOpenChange={setIsUninstallDialogOpen}
          onConfirm={async (): Promise<void> => {
            await handleUninstall(plugin);
          }}
        />
      ) : null}
    </div>
  );
}

function getPluginDetailViewState({
  errorMessage,
  isLoading,
  marketplacePath,
  plugin,
  pluginName,
}: {
  errorMessage: string | null;
  isLoading: boolean;
  marketplacePath: string | null;
  plugin: AppServer.v2.PluginDetail | null;
  pluginName: string | null;
}): "error" | "loading" | "missing" | "ready" {
  if (isLoading) {
    return "loading";
  }
  if (errorMessage != null) {
    return "error";
  }
  if (marketplacePath == null || pluginName == null || plugin == null) {
    return "missing";
  }
  return "ready";
}

function PluginDetailActions({
  blockedReason,
  isInstallBlocked,
  isInstallBlockedLoading,
  isInstalling,
  isUninstalling,
  isUpdatingEnabled,
  placement,
  plugin,
  onInstall,
  onEnable,
  onTryInChat,
  onUninstall,
}: {
  blockedReason: PluginInstallBlockedReason;
  isInstallBlocked: boolean;
  isInstallBlockedLoading: boolean;
  isInstalling: boolean;
  isUninstalling: boolean;
  isUpdatingEnabled: boolean;
  placement: "content" | "header";
  plugin: AppServer.v2.PluginDetail;
  onInstall: () => void;
  onEnable: () => void;
  onTryInChat: () => void;
  onUninstall: () => void;
}): ReactElement {
  const isContentPlacement = placement === "content";

  if (!plugin.summary.installed) {
    return (
      <Tooltip
        tooltipContent={
          blockedReason === "connector-unavailable" ? (
            <FormattedMessage {...messages.connectorUnavailable} />
          ) : (
            <FormattedMessage {...messages.disabledByAdmin} />
          )
        }
        disabled={!isInstallBlocked}
      >
        <div className={isContentPlacement ? "flex w-full" : "flex"}>
          <Button
            color="primary"
            size="toolbar"
            className={isContentPlacement ? "w-full justify-center" : undefined}
            disabled={isInstallBlocked || isInstallBlockedLoading}
            loading={isInstalling}
            onClick={onInstall}
          >
            <FormattedMessage
              {...(isInstalling ? messages.addingToCodex : messages.addToCodex)}
            />
          </Button>
        </div>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        color="secondary"
        size="toolbar"
        className={isContentPlacement ? "justify-center" : undefined}
        disabled={isUpdatingEnabled}
        loading={isUninstalling}
        onClick={onUninstall}
      >
        <FormattedMessage {...messages.uninstall} />
      </Button>
      <Button
        color="primary"
        size="toolbar"
        className={isContentPlacement ? "justify-center" : undefined}
        disabled={isUninstalling}
        loading={isUpdatingEnabled}
        onClick={plugin.summary.enabled ? onTryInChat : onEnable}
      >
        {!isUpdatingEnabled && plugin.summary.enabled ? (
          <ChatsIcon className="icon-sm" />
        ) : null}
        <FormattedMessage
          {...(plugin.summary.enabled
            ? messages.tryInCodex
            : messages.enableInCodex)}
        />
      </Button>
    </div>
  );
}

function buildPluginDetailMcpServers({
  apps,
  configuredServers,
  pluginServerNames,
}: {
  apps: Array<AppServer.v2.AppInfo>;
  configuredServers: McpServers;
  pluginServerNames: Array<string>;
}): Array<
  | {
      kind: "app";
      app: AppServer.v2.AppInfo;
    }
  | {
      configKey: string | null;
      kind: "config";
      enabled: boolean;
      installed: boolean;
      name: string;
    }
> {
  return pluginServerNames.map((serverName) => {
    const matchingApp = getPluginDetailMcpApp(apps, serverName);
    if (matchingApp != null) {
      return {
        kind: "app",
        app: matchingApp,
      };
    }

    const configKey = getPluginDetailMcpConfigKey(
      configuredServers,
      serverName,
    );
    const config = configKey == null ? null : configuredServers[configKey];

    return {
      configKey,
      kind: "config",
      enabled: config?.enabled !== false,
      installed: config != null,
      name: serverName,
    };
  });
}

function getPluginDetailMcpApp(
  apps: Array<AppServer.v2.AppInfo>,
  serverName: string,
): AppServer.v2.AppInfo | null {
  const comparableServerName = getComparableMcpServerName(serverName);

  return (
    apps.find((app) => {
      return [
        app.id,
        app.name,
        ...app.pluginDisplayNames,
        ...Object.keys(app.labels ?? {}),
        ...Object.values(app.labels ?? {}),
      ].some((candidate) => {
        return getComparableMcpServerName(candidate) === comparableServerName;
      });
    }) ?? null
  );
}

function getPluginDetailMcpConfigKey(
  configuredServers: McpServers,
  serverName: string,
): string | null {
  const comparableServerName = getComparableMcpServerName(serverName);

  return (
    Object.entries(configuredServers).find(([configKey, config]) => {
      return [configKey, config.name].some((candidate) => {
        return getComparableMcpServerName(candidate) === comparableServerName;
      });
    })?.[0] ?? null
  );
}

function getComparableMcpServerName(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^connector[_-]/, "")
    .replace(/^mcp[_-]/, "")
    .replace(/[\s_-]+/g, "");
}

function getPluginDetailPageTitle(plugin: AppServer.v2.PluginDetail): string {
  return plugin.summary.interface?.displayName ?? plugin.summary.name;
}

function getPluginPrefillPrompt({
  defaultPrompt,
  plugin,
}: {
  defaultPrompt: string | null;
  plugin: AppServer.v2.PluginDetail;
}): string {
  const mention = `[@${getPluginDetailPageTitle(plugin)}](${escapePromptLinkPath(
    getPluginMentionPath(plugin.summary.id),
  )})`;
  const trimmedDefaultPrompt = defaultPrompt?.trim() ?? "";
  return `${mention} ${trimmedDefaultPrompt}`;
}

function getPrimaryPluginDefaultPrompt(
  plugin: AppServer.v2.PluginDetail,
): string | null {
  return (
    plugin.summary.interface?.defaultPrompt?.find((prompt) => {
      return prompt.trim().length > 0;
    }) ?? null
  );
}

async function refreshPluginData({
  invalidateQueriesAndBroadcast,
  marketplacePath,
  pluginName,
  refetchPluginDetail,
}: {
  invalidateQueriesAndBroadcast: (queryKey: Array<unknown>) => Promise<void>;
  marketplacePath: string | null;
  pluginName: string | null;
  refetchPluginDetail?: () => Promise<void>;
}): Promise<void> {
  await Promise.all([
    invalidateQueriesAndBroadcast(PLUGINS_QUERY_KEY),
    invalidateQueriesAndBroadcast([
      ...PLUGIN_DETAIL_QUERY_KEY,
      marketplacePath ?? "",
      pluginName ?? "",
    ]),
  ]);
  await refetchPluginDetail?.();
}
