import { useQueryClient } from "@tanstack/react-query";
import type * as AppServer from "app-server-types";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import { Button } from "@/components/button";
import { Toggle } from "@/components/toggle";
import type { SettingsSectionSlug } from "@/constants/settings-sections";
import { useWindowType } from "@/hooks/use-window-type";
import PlusIcon from "@/icons/plus.svg";
import RegenerateIcon from "@/icons/regenerate.svg";
import SettingsCogIcon from "@/icons/settings.cog.svg";
import { messageBus } from "@/message-bus";
import {
  MCP_SERVERS_QUERY_KEY,
  MCP_SERVERS_STATUS_QUERY_KEY,
  useAddMcpServer,
  useListMcpServersStatus,
  useMcpServers,
  useUpdateMcpServerEnabled,
} from "@/queries/config-queries";
import { ControlGroup } from "@/settings/control-group";
import { SettingsContentLayout } from "@/settings/settings-content-layout";
import { McpSettingsDetail } from "@/settings/settings-content/mcp-settings-detail";
import { SettingsGroup } from "@/settings/settings-group";
import { SettingsRow } from "@/settings/settings-row";
import {
  SettingsSectionSubtitleMessage,
  SettingsSectionTitleMessage,
} from "@/settings/settings-shared";
import { SettingsSurface } from "@/settings/settings-surface";
import type { McpServerConfig } from "@/types/mcp";
import { logger } from "@/utils/logger";

const MCP_SETTINGS_SLUG: SettingsSectionSlug = "mcp-settings";

const EMPTY_MCP_SERVER_CONFIG: McpServerConfig = {
  command: "",
  args: [],
  env_vars: [],
  enabled: true,
};

export function McpSettings(): React.ReactElement {
  const { data: mcpServersConfig } = useMcpServers(null);
  const { data: mcpServerStatuses, isFetching: isFetchingMcpServerStatuses } =
    useListMcpServersStatus();
  const windowType = useWindowType();
  const appServerManager = useDefaultAppServerManager();
  const addMcpServer = useAddMcpServer();
  const updateMcpServerEnabled = useUpdateMcpServerEnabled();
  const queryClient = useQueryClient();
  const [authUrlByMcpServerId, setAuthUrlByMcpServerId] = useState<
    Record<string, string | null>
  >({});
  const [hasMcpServerChanges, setHasMcpServerChanges] =
    useState<boolean>(false);
  const [editingServerKey, setEditingServerKey] = useState<string | null>(null);
  const [editingServerConfig, setEditingServerConfig] =
    useState<McpServerConfig | null>(null);

  const configWriteTarget = mcpServersConfig?.configWriteTarget ?? null;
  const mcpServers = mcpServersConfig?.servers ?? {};
  const serverOrigins = mcpServersConfig?.serverOrigins ?? {};
  const serverKeys = Object.keys(mcpServers);
  const hasServers = serverKeys.length > 0;
  const authStatusByServer = useMemo((): Record<
    string,
    AppServer.v2.McpAuthStatus
  > => {
    const statusMap: Record<string, AppServer.v2.McpAuthStatus> = {};
    if (!mcpServerStatuses) {
      return statusMap;
    }

    mcpServerStatuses.data.forEach((server) => {
      statusMap[server.name] = server.authStatus;
    });
    return statusMap;
  }, [mcpServerStatuses]);

  const handleToggleEnabled = async (
    serverKey: string,
    nextEnabled: boolean,
  ): Promise<void> => {
    try {
      await updateMcpServerEnabled.mutateAsync({
        key: serverKey,
        enabled: nextEnabled,
      });
      await queryClient.invalidateQueries({
        queryKey: MCP_SERVERS_QUERY_KEY,
      });
      setHasMcpServerChanges(true);
    } catch (_error) {
      // Error is logged by the mutation hook
    }
  };

  const handleSaveServer = async (
    nextConfig: McpServerConfig,
    keyHint: string | null,
  ): Promise<void> => {
    const targetKey = buildServerKey(keyHint, serverKeys, editingServerKey);
    const isNewServer =
      editingServerKey == null || !serverKeys.includes(targetKey);
    const configToWrite: McpServerConfig =
      "command" in nextConfig
        ? {
            ...nextConfig,
            env: nextConfig.env ? { ...nextConfig.env } : undefined,
          }
        : {
            ...nextConfig,
            http_headers: nextConfig.http_headers
              ? { ...nextConfig.http_headers }
              : undefined,
            env_http_headers: nextConfig.env_http_headers
              ? { ...nextConfig.env_http_headers }
              : undefined,
          };
    const keyPath = `mcp_servers.${targetKey}`;

    try {
      if (configWriteTarget) {
        const edits: Array<AppServer.v2.ConfigEdit> = [
          {
            keyPath,
            value: configToWrite,
            mergeStrategy: "replace",
          },
        ];
        await addMcpServer.mutateAsync({
          edits,
          filePath: configWriteTarget?.filePath ?? null,
          expectedVersion: configWriteTarget?.expectedVersion ?? null,
        });
        await queryClient.invalidateQueries({
          queryKey: MCP_SERVERS_QUERY_KEY,
        });
        if (isNewServer && isStreamableHttpConfig(nextConfig)) {
          void queryClient.invalidateQueries({
            queryKey: MCP_SERVERS_STATUS_QUERY_KEY,
          });
        }
        setHasMcpServerChanges(true);
        setEditingServerConfig(null);
        setEditingServerKey(null);
      }
    } catch (error) {
      logger.error("Failed to save MCP server", {
        safe: { targetKey },
        sensitive: {
          error,
        },
      });
      throw error;
    }
  };

  const handleUninstall = async (label: string): Promise<void> => {
    const targetKey = buildServerKey(label, serverKeys, editingServerKey);
    const keyPath = `mcp_servers.${targetKey}`;

    try {
      if (configWriteTarget) {
        await addMcpServer.mutateAsync({
          edits: [
            {
              keyPath,
              value: null as AppServer.v2.ConfigEdit["value"],
              mergeStrategy: "replace",
            },
          ],
          filePath: configWriteTarget?.filePath ?? null,
          expectedVersion: configWriteTarget?.expectedVersion ?? null,
        });
        await queryClient.invalidateQueries({
          queryKey: MCP_SERVERS_QUERY_KEY,
        });
        setHasMcpServerChanges(true);
        setEditingServerConfig(null);
        setEditingServerKey(null);
      }
    } catch (error) {
      logger.error("Failed to uninstall MCP server", {
        safe: { targetKey },
        sensitive: {
          error,
        },
      });
      throw error;
    }
  };

  const handleAuthenticate = async (serverName: string): Promise<void> => {
    if (!isFetchingMcpServerStatuses) {
      const authStatus = authStatusByServer[serverName];
      if (authStatus !== undefined && authStatus !== "notLoggedIn") {
        return;
      }
    }
    const existingUrl = authUrlByMcpServerId[serverName];
    if (existingUrl) {
      messageBus.dispatchMessage("open-in-browser", {
        url: existingUrl,
      });
      return;
    }
    setAuthUrlByMcpServerId((previous) => ({
      ...previous,
      [serverName]: null,
    }));
    try {
      const response = await appServerManager.loginMcpServer({
        name: serverName,
      });
      if (response.authorizationUrl) {
        setAuthUrlByMcpServerId((previous) => ({
          ...previous,
          [serverName]: response.authorizationUrl,
        }));
        messageBus.dispatchMessage("open-in-browser", {
          url: response.authorizationUrl,
        });
      }
    } catch (error) {
      logger.error("Failed to start login for MCP server", {
        safe: { serverName },
        sensitive: {
          error,
        },
      });
      setAuthUrlByMcpServerId((previous) => {
        const { [serverName]: _, ...next } = previous;
        return next;
      });
    }
  };

  const handleAuthenticationCompletedEvent = useEffectEvent(
    (serverName: string, success: boolean): void => {
      setAuthUrlByMcpServerId((previous) => {
        const current = previous[serverName];
        if (success || current == null) {
          const { [serverName]: _, ...next } = previous;
          return next;
        }
        return previous;
      });
      if (success) {
        setHasMcpServerChanges(true);
        void queryClient.invalidateQueries({
          queryKey: MCP_SERVERS_STATUS_QUERY_KEY,
        });
      }
    },
  );

  useEffect((): (() => void) => {
    const handle = ({
      name,
      success,
    }: {
      name: string;
      success: boolean;
    }): void => {
      handleAuthenticationCompletedEvent(name, success);
    };
    const unsubscribe = appServerManager.addMcpLoginCallback(handle);
    return unsubscribe;
  }, [appServerManager]);

  if (editingServerConfig) {
    return (
      <McpSettingsDetail
        config={editingServerConfig}
        initialKey={editingServerKey}
        onCancel={(): void => {
          setEditingServerConfig(null);
          setEditingServerKey(null);
        }}
        onSave={(nextConfig, label): Promise<void> =>
          handleSaveServer(nextConfig, label)
        }
        onUninstall={
          editingServerKey
            ? (label): Promise<void> => handleUninstall(label)
            : undefined
        }
      />
    );
  }

  const title = <SettingsSectionTitleMessage slug={MCP_SETTINGS_SLUG} />;
  const subtitle = <SettingsSectionSubtitleMessage slug={MCP_SETTINGS_SLUG} />;
  const restartAction = hasMcpServerChanges ? (
    <Button
      color="ghost"
      size="toolbar"
      onClick={(): void => {
        messageBus.dispatchMessage("codex-app-server-restart", {
          hostId: appServerManager.getHostId(),
        });
      }}
    >
      <RegenerateIcon className="icon-2xs" />
      {windowType === "electron" ? (
        <FormattedMessage
          id="settings.mcp.restartApp"
          defaultMessage="Restart"
          description="Button label to restart the codex electron app after MCP settings change"
        />
      ) : (
        <FormattedMessage
          id="settings.mcp.restartExtension"
          defaultMessage="Restart extension"
          description="Button label to restart the extension after MCP settings change"
        />
      )}
    </Button>
  ) : null;
  const handleStartAddServer = (): void => {
    setEditingServerKey(null);
    setEditingServerConfig({
      ...EMPTY_MCP_SERVER_CONFIG,
      name: undefined,
    });
  };

  return (
    <SettingsContentLayout
      title={title}
      subtitle={subtitle}
      action={restartAction}
    >
      <SettingsGroup>
        <SettingsGroup.Header
          title={
            <FormattedMessage
              id="settings.mcp.myServers"
              defaultMessage="Servers"
              description="Heading for the user's MCP servers list"
            />
          }
          actions={
            serverKeys.length > 0 && (
              <AddServerButton onClick={handleStartAddServer} />
            )
          }
        />
        <SettingsGroup.Content>
          <SettingsSurface>
            {hasServers ? (
              serverKeys.map((serverKey) => (
                <McpServerRow
                  key={serverKey}
                  name={mcpServers[serverKey]?.name ?? serverKey}
                  statusLoading={isFetchingMcpServerStatuses}
                  enabled={mcpServers[serverKey]?.enabled !== false}
                  authStatus={authStatusByServer[serverKey]}
                  onAuthenticateClicked={(): Promise<void> =>
                    handleAuthenticate(serverKey)
                  }
                  onEnableClicked={
                    mcpServers[serverKey]
                      ? (next): Promise<void> =>
                          handleToggleEnabled(serverKey, next)
                      : undefined
                  }
                  onSettingsClicked={
                    mcpServers[serverKey]
                      ? async (): Promise<void> => {
                          setEditingServerKey(serverKey);
                          setEditingServerConfig(mcpServers[serverKey]);
                        }
                      : undefined
                  }
                  isReadOnly={serverOrigins[serverKey]?.name.type === "project"}
                />
              ))
            ) : (
              <SettingsRow
                label={
                  <FormattedMessage
                    id="settings.mcp.empty"
                    defaultMessage="No MCP servers connected"
                    description="Empty state for MCP servers list"
                  />
                }
                control={<AddServerButton onClick={handleStartAddServer} />}
              />
            )}
          </SettingsSurface>
        </SettingsGroup.Content>
      </SettingsGroup>
    </SettingsContentLayout>
  );
}

function buildServerKey(
  hint: string | null,
  existingKeys: Array<string>,
  currentKey: string | null,
): string {
  const normalized =
    hint
      ?.trim()
      .replace(/\s+/gu, "_")
      .replace(/[^a-zA-Z0-9-_]+/gu, "-")
      .replace(/-+/gu, "-") ?? "";
  const base =
    normalized.length > 0 ? normalized.toLowerCase() : "custom-server";

  const disallowed = existingKeys.filter((key) =>
    currentKey == null ? true : key !== currentKey,
  );

  if (!disallowed.includes(base)) {
    return base;
  }

  let counter = 2;
  let candidate = `${base}-${counter}`;
  while (disallowed.includes(candidate)) {
    counter += 1;
    candidate = `${base}-${counter}`;
  }
  return candidate;
}

function isStreamableHttpConfig(
  config: McpServerConfig,
): config is McpServerConfig & { url: string } {
  return "url" in config;
}

function McpServerRow({
  name,
  statusLoading,
  onAuthenticateClicked,
  authStatus,
  onEnableClicked,
  enabled,
  onSettingsClicked,
  isReadOnly,
}: {
  name: string;
  statusLoading?: boolean;
  onAuthenticateClicked?: () => Promise<void>;
  authStatus?: AppServer.v2.McpAuthStatus;
  onEnableClicked?: (next: boolean) => Promise<void>;
  enabled?: boolean;
  onSettingsClicked?: () => Promise<void>;
  isReadOnly?: boolean;
}): React.ReactElement {
  const intl = useIntl();
  const showAuthenticateButton =
    !statusLoading &&
    onAuthenticateClicked !== undefined &&
    authStatus &&
    authStatus !== "unsupported" &&
    !(authStatus === "bearerToken" || authStatus === "oAuth");
  const showActions =
    onEnableClicked !== undefined ||
    onSettingsClicked !== undefined ||
    showAuthenticateButton;

  return (
    <SettingsRow
      label={
        <span className="flex min-w-0 flex-col gap-0.5 text-sm">
          <span className="flex flex-wrap items-end gap-1">
            <span className="font-medium text-token-text-primary">{name}</span>
          </span>
        </span>
      }
      description={null}
      control={
        showActions ? (
          <ControlGroup>
            {showAuthenticateButton ? (
              <Button
                color="outline"
                disabled={!!statusLoading}
                className="rounded-sm"
                onClick={(): void => {
                  void onAuthenticateClicked();
                }}
              >
                <FormattedMessage
                  id="settings.mcp.server.login"
                  defaultMessage="Authenticate"
                  description="Button label to authenticate with an MCP server"
                />
              </Button>
            ) : null}
            {onSettingsClicked ? (
              <Button
                color="ghost"
                size="toolbar"
                uniform
                // TODO: Re-enable project-config edits once the app server supports project config writes.
                disabled={isReadOnly === true}
                onClick={(): void => {
                  void onSettingsClicked();
                }}
                aria-label={intl.formatMessage({
                  id: "settings.mcp.server.settings",
                  defaultMessage: "Settings",
                  description: "Button label to view MCP server settings",
                })}
              >
                <SettingsCogIcon className="icon-xs" />
              </Button>
            ) : null}
            {onEnableClicked ? (
              <Toggle
                // TODO: Re-enable project-config toggles once the app server supports project config writes.
                disabled={statusLoading === true || isReadOnly === true}
                checked={enabled === true}
                onChange={(next): void => {
                  void onEnableClicked(next);
                }}
                ariaLabel={intl.formatMessage({
                  id: "settings.mcp.server.enable",
                  defaultMessage: "Enable",
                  description: "Toggle to enable an MCP server",
                })}
              />
            ) : null}
          </ControlGroup>
        ) : null
      }
    />
  );
}

function AddServerButton({
  onClick,
}: {
  onClick?: () => void;
}): React.ReactElement {
  return (
    <Button
      color="ghost"
      size="toolbar"
      onClick={(): void => {
        onClick?.();
      }}
    >
      <PlusIcon className="icon-2xs" />
      <FormattedMessage
        id="settings.mcp.addServer"
        defaultMessage="Add server"
        description="Button to add a new MCP server"
      />
    </Button>
  );
}
