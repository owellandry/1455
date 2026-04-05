import type * as AppServer from "app-server-types";
import clsx from "clsx";
import type { ReactElement } from "react";
import { useRef, useState } from "react";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";
import { CardStatusIndicator } from "@/components/card-status-indicator";
import { CardTile } from "@/components/card-tile";
import { ConnectorLogo } from "@/components/connector-logo";
import { InstalledCardActions } from "@/components/installed-card-actions";
import { LargeEmptyState } from "@/components/large-empty-state";
import { Spinner } from "@/components/spinner";
import { Toggle } from "@/components/toggle";
import { Tooltip } from "@/components/tooltip";
import AppsIcon from "@/icons/apps.svg";
import ChatsIcon from "@/icons/chats.svg";
import CheckIcon from "@/icons/check-md.svg";
import EmptyStatePuzzlePieceIcon from "@/icons/empty-state-puzzle-piece.svg";
import PlusIcon from "@/icons/plus.svg";
import TrashIcon from "@/icons/trash.svg";

import { getPluginDisplayName } from "./get-plugin-display-name";
import { PluginUninstallDialog } from "./plugin-uninstall-dialog";
import { getMarketplaceDisplayLabel } from "./plugins-page-selectors";
import type { InstalledPlugin } from "./use-plugins";

import styles from "@/skills/skills-page-grid.module.css";

const messages = defineMessages({
  loading: {
    id: "plugins.page.loading",
    defaultMessage: "Loading plugins…",
    description: "Loading title on the plugins page",
  },
  loadingDescription: {
    id: "plugins.page.loading.description",
    defaultMessage: "This can take a few seconds the first time.",
    description: "Loading hint shown while plugins are still being loaded",
  },
  loadErrorTitle: {
    id: "plugins.page.loadError.title",
    defaultMessage: "Failed to load plugins",
    description: "Title shown when plugins could not be loaded",
  },
  enableToggleTooltip: {
    id: "plugins.card.enableToggleTooltip",
    defaultMessage: "Enable plugin",
    description: "Tooltip label for enabling a plugin",
  },
  disableToggleTooltip: {
    id: "plugins.card.disableToggleTooltip",
    defaultMessage: "Disable plugin",
    description: "Tooltip label for disabling a plugin",
  },
  toggleAria: {
    id: "plugins.card.toggleAria",
    defaultMessage: "Toggle plugin enabled state",
    description: "Accessible label for the plugin enablement toggle",
  },
  enabledStatus: {
    id: "plugins.card.enabledStatus",
    defaultMessage: "Plugin enabled",
    description: "Status label for an installed plugin that is enabled",
  },
  enableButton: {
    id: "plugins.card.enableButton",
    defaultMessage: "Enable",
    description:
      "Button label for enabling a disabled plugin from a plugin card",
  },
  disabledStatus: {
    id: "plugins.card.disabledStatus",
    defaultMessage: "Plugin disabled",
    description: "Status label for an installed plugin that is disabled",
  },
  installTooltip: {
    id: "plugins.card.installTooltip",
    defaultMessage: "Install plugin",
    description: "Tooltip label for installing a plugin",
  },
  uninstallTooltip: {
    id: "plugins.card.uninstallTooltip",
    defaultMessage: "Uninstall plugin",
    description: "Tooltip label for uninstalling a plugin",
  },
  tryInChat: {
    id: "plugins.card.tryInChat",
    defaultMessage: "Try in Chat",
    description: "Tooltip label for trying a plugin in chat from a plugin card",
  },
});

export function PluginsCardsGrid({
  emptyStateAction,
  errorMessage,
  isLoading,
  installedStateAction = "status",
  isSingleColumn = false,
  useCompactEmptyState = false,
  plugins,
  emptyStateTitle,
  onInstallPlugin,
  onOpenPluginDetails,
  onTryInChat,
  onUninstallInstalledPlugin,
  onToggleInstalledPluginEnabled,
  pendingPluginId,
  pendingUninstallPluginId,
}: {
  emptyStateAction?: ReactElement | null;
  errorMessage: string | null;
  isLoading: boolean;
  installedStateAction?: "menu" | "status" | "toggle";
  isSingleColumn?: boolean;
  useCompactEmptyState?: boolean;
  plugins: Array<InstalledPlugin>;
  emptyStateTitle: ReactElement;
  onInstallPlugin: (plugin: InstalledPlugin) => Promise<void>;
  onOpenPluginDetails?: (plugin: InstalledPlugin) => void;
  onTryInChat?: (plugin: InstalledPlugin) => void;
  onUninstallInstalledPlugin?: (params: {
    pluginDisplayName: string;
    pluginId: string;
  }) => Promise<void>;
  onToggleInstalledPluginEnabled?: (params: {
    pluginDisplayName: string;
    pluginId: string;
    enabled: boolean;
  }) => Promise<AppServer.v2.ConfigWriteResponse>;
  pendingPluginId?: string | null;
  pendingUninstallPluginId?: string | null;
}): ReactElement {
  const [pluginPendingUninstallConfirm, setPluginPendingUninstallConfirm] =
    useState<InstalledPlugin | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-full min-h-full flex-1 items-center justify-center py-8">
        <LargeEmptyState
          title={<FormattedMessage {...messages.loading} />}
          description={
            <span className="inline-flex items-center gap-2">
              <Spinner className="icon-xxs text-token-description-foreground" />
              <FormattedMessage {...messages.loadingDescription} />
            </span>
          }
          illustration={
            <EmptyStatePuzzlePieceIcon
              aria-hidden
              className="h-20 w-auto text-token-input-placeholder-foreground"
            />
          }
        />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex h-full min-h-full flex-1 items-center justify-center py-8">
        <LargeEmptyState
          title={<FormattedMessage {...messages.loadErrorTitle} />}
          description={errorMessage}
          illustration={
            <EmptyStatePuzzlePieceIcon
              aria-hidden
              className="h-20 w-auto text-token-input-placeholder-foreground"
            />
          }
        />
      </div>
    );
  }

  if (plugins.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center py-8">
        {useCompactEmptyState ? (
          <div className="text-sm text-token-text-secondary">
            {emptyStateTitle}
          </div>
        ) : (
          <LargeEmptyState
            title={emptyStateTitle}
            description={emptyStateAction}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <div
        className={clsx(
          "grid gap-4",
          isSingleColumn ? "grid-cols-1" : styles.grid,
        )}
      >
        {plugins.map((plugin) => (
          <PluginCard
            key={plugin.plugin.source.path}
            installedStateAction={installedStateAction}
            isUpdatingEnabled={pendingPluginId === plugin.plugin.id}
            isUninstalling={pendingUninstallPluginId === plugin.plugin.id}
            onUninstallInstalledPlugin={
              onUninstallInstalledPlugin == null
                ? undefined
                : (selectedPlugin): void => {
                    setPluginPendingUninstallConfirm(selectedPlugin);
                  }
            }
            onOpenPluginDetails={onOpenPluginDetails}
            onToggleInstalledPluginEnabled={onToggleInstalledPluginEnabled}
            plugin={plugin}
            onInstallPlugin={onInstallPlugin}
            onTryInChat={onTryInChat}
          />
        ))}
      </div>
      {pluginPendingUninstallConfirm != null &&
      onUninstallInstalledPlugin != null ? (
        <PluginUninstallDialog
          isUninstalling={
            pendingUninstallPluginId === pluginPendingUninstallConfirm.plugin.id
          }
          open
          pluginDisplayName={getPluginDisplayName(
            pluginPendingUninstallConfirm,
          )}
          onOpenChange={(nextOpen): void => {
            if (!nextOpen) {
              setPluginPendingUninstallConfirm(null);
            }
          }}
          onConfirm={async (): Promise<void> => {
            try {
              await onUninstallInstalledPlugin({
                pluginId: pluginPendingUninstallConfirm.plugin.id,
                pluginDisplayName: getPluginDisplayName(
                  pluginPendingUninstallConfirm,
                ),
              });
            } finally {
              setPluginPendingUninstallConfirm(null);
            }
          }}
        />
      ) : null}
    </>
  );
}

export function PluginCard({
  installedStateAction,
  isUpdatingEnabled,
  isUninstalling,
  onOpenPluginDetails,
  onUninstallInstalledPlugin,
  onToggleInstalledPluginEnabled,
  plugin,
  onInstallPlugin,
  onTryInChat,
}: {
  installedStateAction: "menu" | "status" | "toggle";
  isUpdatingEnabled: boolean;
  isUninstalling: boolean;
  onOpenPluginDetails?: (plugin: InstalledPlugin) => void;
  onUninstallInstalledPlugin?: (plugin: InstalledPlugin) => void;
  onToggleInstalledPluginEnabled?: (params: {
    pluginDisplayName: string;
    pluginId: string;
    enabled: boolean;
  }) => Promise<AppServer.v2.ConfigWriteResponse>;
  plugin: InstalledPlugin;
  onInstallPlugin: (plugin: InstalledPlugin) => Promise<void>;
  onTryInChat?: (plugin: InstalledPlugin) => void;
}): ReactElement {
  const intl = useIntl();
  const shouldIgnoreNextCardClickRef = useRef(false);
  const actionMode = getPluginCardActionMode({
    installedStateAction,
    plugin,
    onToggleInstalledPluginEnabled,
  });
  const isDisabledInstalledPlugin =
    plugin.plugin.installed && !plugin.plugin.enabled;

  return (
    <CardTile
      className="group !cursor-pointer justify-center border-none"
      contentClassName={isDisabledInstalledPlugin ? "opacity-60" : undefined}
      actionsPlacement="center"
      iconContainer={false}
      icon={
        <span
          className={clsx(
            "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-token-border-default bg-transparent",
            onOpenPluginDetails ? "!cursor-pointer" : null,
          )}
        >
          <ConnectorLogo
            alt={getPluginDisplayName(plugin)}
            className="h-full w-full object-contain"
            logoUrl={plugin.logoPath}
            fallback={
              <AppsIcon className="icon-md text-token-text-secondary" />
            }
          />
        </span>
      }
      title={getPluginDisplayName(plugin)}
      description={plugin.description ?? undefined}
      descriptionClassName="line-clamp-1"
      badges={getPluginBadges(plugin)}
      onClick={
        onOpenPluginDetails
          ? (): void => {
              if (shouldIgnoreNextCardClickRef.current) {
                shouldIgnoreNextCardClickRef.current = false;
                return;
              }
              onOpenPluginDetails(plugin);
            }
          : undefined
      }
      actions={
        actionMode === "toggle" ? (
          <div className="flex items-center gap-2">
            {onUninstallInstalledPlugin ? (
              <div className="invisible opacity-0 transition-opacity group-hover:visible group-hover:opacity-100">
                <Tooltip
                  tooltipContent={
                    <FormattedMessage {...messages.uninstallTooltip} />
                  }
                >
                  <Button
                    color="ghost"
                    size="icon"
                    className="!cursor-pointer"
                    disabled={isUninstalling}
                    aria-label={intl.formatMessage(messages.uninstallTooltip)}
                    onClick={(event): void => {
                      event.stopPropagation();
                      onUninstallInstalledPlugin(plugin);
                    }}
                  >
                    <TrashIcon className="icon-sm" />
                  </Button>
                </Tooltip>
              </div>
            ) : null}
            <Tooltip
              tooltipContent={
                plugin.plugin.enabled ? (
                  <FormattedMessage {...messages.disableToggleTooltip} />
                ) : (
                  <FormattedMessage {...messages.enableToggleTooltip} />
                )
              }
            >
              <Toggle
                checked={plugin.plugin.enabled}
                disabled={isUpdatingEnabled || isUninstalling}
                ariaLabel={intl.formatMessage(messages.toggleAria)}
                onClick={(event): void => {
                  event.stopPropagation();
                }}
                onChange={(nextEnabled): void => {
                  void onToggleInstalledPluginEnabled?.({
                    pluginId: plugin.plugin.id,
                    pluginDisplayName: getPluginDisplayName(plugin),
                    enabled: nextEnabled,
                  });
                }}
              />
            </Tooltip>
          </div>
        ) : actionMode === "menu" ? (
          <InstalledCardActions
            disableMenuLabel={
              <FormattedMessage
                id="plugins.card.disableMenuItem"
                defaultMessage="Disable"
                description="Menu item label for disabling a plugin from a plugin card"
              />
            }
            enableButtonLabel={<FormattedMessage {...messages.enableButton} />}
            enabledStatusAriaLabel={intl.formatMessage(messages.enabledStatus)}
            isEnabled={plugin.plugin.enabled}
            isUninstalling={isUninstalling}
            isUpdating={isUpdatingEnabled}
            menuLabel={intl.formatMessage({
              id: "plugins.card.actionsMenu",
              defaultMessage: "Plugin actions",
              description:
                "Aria label for the plugin card actions menu trigger",
            })}
            onDisable={
              onToggleInstalledPluginEnabled
                ? () => {
                    shouldIgnoreNextCardClickRef.current = true;
                    void onToggleInstalledPluginEnabled({
                      pluginId: plugin.plugin.id,
                      pluginDisplayName: getPluginDisplayName(plugin),
                      enabled: false,
                    });
                  }
                : undefined
            }
            onEnable={
              isDisabledInstalledPlugin && onToggleInstalledPluginEnabled
                ? () => {
                    shouldIgnoreNextCardClickRef.current = true;
                    void onToggleInstalledPluginEnabled({
                      pluginId: plugin.plugin.id,
                      pluginDisplayName: getPluginDisplayName(plugin),
                      enabled: true,
                    });
                  }
                : undefined
            }
            onUninstall={
              onUninstallInstalledPlugin
                ? () => {
                    shouldIgnoreNextCardClickRef.current = true;
                    onUninstallInstalledPlugin(plugin);
                  }
                : undefined
            }
            uninstallMenuLabel={
              <FormattedMessage
                id="plugins.card.uninstallMenuItem"
                defaultMessage="Uninstall"
                description="Menu item label for uninstalling a plugin from a plugin card"
              />
            }
          />
        ) : actionMode === "status" ? (
          <PluginCardStatusAction
            isEnabled={plugin.plugin.enabled}
            onTryInChat={
              onTryInChat == null
                ? undefined
                : (): void => {
                    shouldIgnoreNextCardClickRef.current = true;
                    onTryInChat(plugin);
                  }
            }
            tryInChatLabel={intl.formatMessage(messages.tryInChat)}
            enabledStatusAriaLabel={intl.formatMessage(messages.enabledStatus)}
          />
        ) : (
          <Tooltip
            tooltipContent={<FormattedMessage {...messages.installTooltip} />}
          >
            <div className="cursor-interaction">
              <Button
                color="secondary"
                size="icon"
                className="!cursor-pointer"
                aria-label={intl.formatMessage(messages.installTooltip)}
                onClick={(event): void => {
                  event.stopPropagation();
                  void onInstallPlugin(plugin);
                }}
              >
                <PlusIcon className="icon-sm" />
              </Button>
            </div>
          </Tooltip>
        )
      }
    />
  );
}

function PluginCardStatusAction({
  enabledStatusAriaLabel,
  isEnabled,
  onTryInChat,
  tryInChatLabel,
}: {
  enabledStatusAriaLabel: string;
  isEnabled: boolean;
  onTryInChat?: () => void;
  tryInChatLabel: string;
}): ReactElement {
  if (!isEnabled) {
    return <span aria-hidden className="h-7 w-7 shrink-0" />;
  }

  return (
    <div className="relative flex h-7 w-7 shrink-0 items-center justify-center">
      <span className="transition-opacity group-hover:opacity-0">
        <CardStatusIndicator
          ariaLabel={enabledStatusAriaLabel}
          icon={<CheckIcon className="icon-sm opacity-60" />}
        />
      </span>
      {onTryInChat != null ? (
        <div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
          <Tooltip tooltipContent={tryInChatLabel}>
            <Button
              color="ghost"
              size="icon"
              className="!cursor-pointer text-token-foreground"
              aria-label={tryInChatLabel}
              onClick={(event): void => {
                event.stopPropagation();
                onTryInChat();
              }}
            >
              <ChatsIcon className="icon-sm" />
            </Button>
          </Tooltip>
        </div>
      ) : null}
    </div>
  );
}

function getPluginCardActionMode({
  installedStateAction,
  plugin,
  onToggleInstalledPluginEnabled,
}: {
  installedStateAction: "menu" | "status" | "toggle";
  plugin: InstalledPlugin;
  onToggleInstalledPluginEnabled?: (params: {
    pluginDisplayName: string;
    pluginId: string;
    enabled: boolean;
  }) => Promise<AppServer.v2.ConfigWriteResponse>;
}): "install" | "menu" | "status" | "toggle" {
  if (
    plugin.plugin.installed &&
    installedStateAction === "toggle" &&
    onToggleInstalledPluginEnabled
  ) {
    return "toggle";
  }

  if (
    plugin.plugin.installed &&
    installedStateAction === "menu" &&
    onToggleInstalledPluginEnabled
  ) {
    return "menu";
  }

  if (plugin.plugin.installed) {
    return "status";
  }

  return "install";
}

function getPluginBadges(plugin: InstalledPlugin): Array<ReactElement> {
  const badges: Array<ReactElement> = [];

  if (
    plugin.marketplaceName.length > 0 &&
    getMarketplaceDisplayLabel(plugin.marketplaceName) !== "Built by OpenAI"
  ) {
    badges.push(
      <span
        key={`${plugin.plugin.source.path}-marketplace`}
        className="text-token-description-foreground"
      >
        {getMarketplaceDisplayLabel(plugin.marketplaceName)}
      </span>,
    );
  }

  return badges;
}
