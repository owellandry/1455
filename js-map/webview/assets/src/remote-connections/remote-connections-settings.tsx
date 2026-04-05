import { useScope } from "maitai";
import {
  DEFAULT_REMOTE_SSH_CONNECTION_AUTO_CONNECT,
  buildCodexManagedRemoteConnectionHostId,
  getRemoteControlConnections,
  getRemoteSshConnectionsFromSource,
  isRemoteSshConnection,
  type AppServerConnectionState,
  type RemoteConnection,
  type RemoteControlConnection,
  type RemoteSshConnection,
} from "protocol";
import type {
  ChangeEventHandler,
  FormEvent,
  ReactElement,
  ReactNode,
} from "react";
import { useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router";

import { AppServerConnectionStateBadge } from "@/app-server/app-server-connection-state";
import { AppServerManager } from "@/app-server/app-server-manager";
import { useAppServerRegistry } from "@/app-server/app-server-manager-hooks";
import { useRemoteConnectionStates } from "@/app-server/use-remote-connection-states";
import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSection,
} from "@/components/dialog-layout";
import { FormattedRelativeDateTime } from "@/components/format-relative-date-time";
import { toast$ } from "@/components/toaster/toast-signal";
import { Toggle } from "@/components/toggle";
import { Tooltip } from "@/components/tooltip";
import PencilIcon from "@/icons/pencil.svg";
import PlusIcon from "@/icons/plus.svg";
import RegenerateIcon from "@/icons/regenerate.svg";
import TrashIcon from "@/icons/trash.svg";
import { AppScope } from "@/scopes/app-scope";
import { SettingsContentLayout } from "@/settings/settings-content-layout";
import { SettingsGroup } from "@/settings/settings-group";
import { SettingsSectionTitleMessage } from "@/settings/settings-shared";
import { SettingsSurface } from "@/settings/settings-surface";
import { useSharedObject } from "@/shared-objects/use-shared-object";
import { logger } from "@/utils/logger";
import { useMutationFromVSCode } from "@/vscode-api";

import { RemoteConnectionAuthDialog } from "./remote-connection-auth-dialog";
import { RemoteConnectionsTruncatedCellText } from "./remote-connections-truncated-cell-text";

type RemoteConnectionDraft = {
  displayName: string;
  sshHost: string;
  sshPort: string;
  identity: string;
};

type EditorState =
  | {
      mode: "add";
      draft: RemoteConnectionDraft;
    }
  | {
      mode: "edit";
      hostId: string;
      draft: RemoteConnectionDraft;
    };

const EMPTY_CELL_PLACEHOLDER = "—";
const REFRESH_SUCCESS_TOAST_ID = "remote-connections-refresh-success";
const REFRESH_ERROR_TOAST_ID = "remote-connections-refresh-error";
const SAVE_SUCCESS_TOAST_ID = "remote-connections-save-success";
const SAVE_ERROR_TOAST_ID = "remote-connections-save-error";
const CONNECT_TOGGLE_ERROR_TOAST_ID = "remote-connections-connect-toggle-error";
const REMOTE_CONNECTIONS_SETTINGS_LOG_PREFIX = "[remote-connections/settings]";

export function RemoteConnectionsSettings(): ReactElement {
  const appServerRegistry = useAppServerRegistry();
  const intl = useIntl();
  const navigate = useNavigate();
  const scope = useScope(AppScope);
  const [remoteConnectionsData] = useSharedObject("remote_connections");
  const [remoteControlConnectionsState] = useSharedObject(
    "remote_control_connections_state",
  );
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [authenticatingHostId, setAuthenticatingHostId] = useState<
    string | null
  >(null);

  const isRemoteConnectionsLoading = remoteConnectionsData == null;
  const showRemoteControlConnectionsSection =
    remoteControlConnectionsState?.available ?? true;
  const remoteConnections = [...(remoteConnectionsData ?? [])].sort(
    compareRemoteConnectionsByDisplayName,
  );
  const sshConnections = remoteConnections.filter(isRemoteSshConnection);
  const remoteControlConnections = getRemoteControlConnections(
    remoteConnectionsData,
  ).sort(compareRemoteConnectionsByDisplayName);
  const remoteConnectionStatesByHostId =
    useRemoteConnectionStates(sshConnections);
  const codexManagedConnections = getRemoteSshConnectionsFromSource(
    remoteConnectionsData,
    "codex-managed",
  );
  const hasConnectedRemoteConnection = Object.values(
    remoteConnectionStatesByHostId,
  ).some((state) => state === "connected");

  const refreshRemoteConnectionsMutation = useMutationFromVSCode(
    "refresh-remote-connections",
    {
      onSuccess: () => {
        scope.get(toast$).success(
          intl.formatMessage({
            id: "settings.remoteConnections.refresh.success",
            defaultMessage: "Refreshed remote connections",
            description:
              "Toast shown when remote connections refresh successfully",
          }),
          { id: REFRESH_SUCCESS_TOAST_ID },
        );
      },
      onError: (error) => {
        logger.warning(
          `${REMOTE_CONNECTIONS_SETTINGS_LOG_PREFIX} refresh_failed`,
          {
            safe: {},
            sensitive: { error },
          },
        );
        scope.get(toast$).danger(
          error instanceof Error
            ? error.message
            : intl.formatMessage({
                id: "settings.remoteConnections.refresh.error",
                defaultMessage: "Failed to refresh remote connections",
                description:
                  "Toast shown when remote connections fail to refresh",
              }),
          { id: REFRESH_ERROR_TOAST_ID },
        );
      },
    },
  );
  const saveCodexManagedConnectionsMutation = useMutationFromVSCode(
    "save-codex-managed-remote-ssh-connections",
    {
      onSuccess: () => {
        scope.get(toast$).success(
          intl.formatMessage({
            id: "settings.remoteConnections.save.success",
            defaultMessage: "Saved remote connections",
            description: "Toast shown when remote connections are saved",
          }),
          { id: SAVE_SUCCESS_TOAST_ID },
        );
      },
      onError: (error) => {
        logger.warning(
          `${REMOTE_CONNECTIONS_SETTINGS_LOG_PREFIX} save_failed`,
          {
            safe: {},
            sensitive: { error },
          },
        );
        scope.get(toast$).danger(
          intl.formatMessage({
            id: "settings.remoteConnections.save.error",
            defaultMessage: "Failed to save remote connections",
            description: "Toast shown when remote connections fail to save",
          }),
          { id: SAVE_ERROR_TOAST_ID },
        );
      },
    },
  );
  const setRemoteConnectionAutoConnectMutation = useMutationFromVSCode(
    "set-remote-connection-auto-connect",
    {
      onError: (error, { autoConnect, hostId }) => {
        logger.warning(
          `${REMOTE_CONNECTIONS_SETTINGS_LOG_PREFIX} connect_toggle_failed`,
          {
            safe: { autoConnect },
            sensitive: { error, hostId },
          },
        );
        scope.get(toast$).danger(
          intl.formatMessage({
            id: "settings.remoteConnections.connectToggle.error",
            defaultMessage: "Failed to update connection",
            description: "Toast shown when remote connection toggle fails",
          }),
          { id: CONNECT_TOGGLE_ERROR_TOAST_ID },
        );
      },
    },
  );
  const isSavingCodexManagedConnections =
    saveCodexManagedConnectionsMutation.isPending;
  const isMutatingRemoteConnection =
    refreshRemoteConnectionsMutation.isPending ||
    saveCodexManagedConnectionsMutation.isPending ||
    setRemoteConnectionAutoConnectMutation.isPending;

  const ensureRemoteConnectionManager = (hostId: string): AppServerManager => {
    const existingManager = appServerRegistry.getForHostId(hostId);
    if (existingManager != null) {
      return existingManager;
    }

    const manager = new AppServerManager(hostId, scope.queryClient);
    appServerRegistry.addManager(manager);
    return manager;
  };

  const handleRefreshRemoteConnections = (): void => {
    refreshRemoteConnectionsMutation.mutate(undefined);
  };

  const syncRemoteConnectionState = (
    hostId: string,
    state: AppServerConnectionState | null,
    errorMessage: string | null,
  ): void => {
    const manager = ensureRemoteConnectionManager(hostId);
    manager.setConnectionState(
      state ?? "disconnected",
      errorMessage,
      "settings_sync_remote_connection_state",
    );
    appServerRegistry.notifyRegistryChanged();
  };

  const handleModalDraftChange = (
    updater: (draft: RemoteConnectionDraft) => RemoteConnectionDraft,
  ): void => {
    setEditorState((previousEditorState) => {
      if (previousEditorState == null) {
        return previousEditorState;
      }
      return {
        ...previousEditorState,
        draft: updater(previousEditorState.draft),
      };
    });
  };

  const handleModalSubmit = (): void => {
    if (editorState == null || isSavingCodexManagedConnections) {
      return;
    }

    const previousConnection =
      editorState.mode === "edit"
        ? (codexManagedConnections.find((connection) => {
            return connection.hostId === editorState.hostId;
          }) ?? null)
        : null;
    const nextConnection = toCodexManagedRemoteSshConnection(
      editorState.draft,
      previousConnection?.autoConnect ??
        DEFAULT_REMOTE_SSH_CONNECTION_AUTO_CONNECT,
    );
    const nextConnections =
      editorState.mode === "add"
        ? [...codexManagedConnections, nextConnection]
        : codexManagedConnections
            .filter((connection) => {
              return connection.hostId !== editorState.hostId;
            })
            .concat(nextConnection)
            .sort(compareRemoteConnectionsByDisplayName);

    saveCodexManagedConnectionsMutation.mutate(
      {
        remoteConnections: nextConnections,
      },
      {
        onSuccess: () => {
          setEditorState(null);
          if (nextConnection.autoConnect) {
            handleAutoConnectChange(nextConnection.hostId, true);
          }
        },
      },
    );
  };

  const handleRemoveConnection = (hostIdToRemove: string): void => {
    if (isSavingCodexManagedConnections) {
      return;
    }

    saveCodexManagedConnectionsMutation.mutate({
      remoteConnections: codexManagedConnections.filter((connection) => {
        return connection.hostId !== hostIdToRemove;
      }),
    });
  };

  const handleAutoConnectChange = (
    hostId: string,
    autoConnect: boolean,
  ): void => {
    if (isSavingCodexManagedConnections) {
      return;
    }

    setRemoteConnectionAutoConnectMutation.mutate(
      {
        hostId,
        autoConnect,
      },
      {
        onSuccess: ({ state, errorMessage }) => {
          syncRemoteConnectionState(hostId, state, errorMessage);
        },
      },
    );
  };

  return (
    <>
      <SettingsContentLayout
        title={<SettingsSectionTitleMessage slug="connections" />}
        subtitle={
          <FormattedMessage
            id="remoteConnections.page.subheading"
            defaultMessage="Manage your remote Codex connections"
            description="Subheading shown above the remote connections list"
          />
        }
        fullWidth
        contentClassName="max-w-[1200px]"
      >
        <SettingsGroup className="gap-3">
          <SettingsGroup.Header
            title={
              <FormattedMessage
                id="settings.remoteConnections.header.title"
                defaultMessage="SSH connections"
                description="Header title for the unified remote SSH connections list"
              />
            }
            actions={
              hasConnectedRemoteConnection ? (
                <Button
                  color="primary"
                  size="toolbar"
                  onClick={() =>
                    navigate("/", {
                      state: {
                        pendingViewAction: "open-create-remote-project-modal",
                      },
                    })
                  }
                >
                  <FormattedMessage
                    id="settings.remoteConnections.createRemoteProject"
                    defaultMessage="Create a remote project"
                    description="Button shown above the remote connections table after at least one remote connection is connected"
                  />
                </Button>
              ) : null
            }
          />
          <SettingsGroup.Content>
            <SettingsSurface>
              {isRemoteConnectionsLoading ? (
                <div className="p-3 text-sm text-token-text-secondary">
                  <FormattedMessage
                    id="settings.remoteConnections.loading"
                    defaultMessage="Loading remote connections…"
                    description="Loading message for remote connections settings"
                  />
                </div>
              ) : null}
              {!isRemoteConnectionsLoading ? (
                <RemoteConnectionsTable
                  connections={sshConnections}
                  disabled={isSavingCodexManagedConnections}
                  onAddConnection={() =>
                    setEditorState({
                      mode: "add",
                      draft: createEmptyDraft(),
                    })
                  }
                  onRefresh={handleRefreshRemoteConnections}
                  onEdit={(hostId) => {
                    const targetConnection = codexManagedConnections.find(
                      (connection) => {
                        return connection.hostId === hostId;
                      },
                    );
                    if (targetConnection == null) {
                      return;
                    }

                    setEditorState({
                      mode: "edit",
                      hostId,
                      draft: toDraft(targetConnection),
                    });
                  }}
                  onRemove={handleRemoveConnection}
                  onToggleConnection={handleAutoConnectChange}
                  onAuthenticate={(hostId) => {
                    ensureRemoteConnectionManager(hostId);
                    setAuthenticatingHostId(hostId);
                  }}
                />
              ) : null}
            </SettingsSurface>
          </SettingsGroup.Content>
        </SettingsGroup>

        {showRemoteControlConnectionsSection ? (
          <SettingsGroup className="gap-3">
            <SettingsGroup.Header
              title={
                <FormattedMessage
                  id="settings.remoteControlConnections.header.title"
                  defaultMessage="Remote control environments"
                  description="Header title for the remote control connections list"
                />
              }
            />
            <SettingsGroup.Content>
              <SettingsSurface>
                {isRemoteConnectionsLoading ? (
                  <div className="p-3 text-sm text-token-text-secondary">
                    <FormattedMessage
                      id="settings.remoteControlConnections.loading"
                      defaultMessage="Loading remote control environments…"
                      description="Loading message for the remote control settings section"
                    />
                  </div>
                ) : null}
                {!isRemoteConnectionsLoading &&
                remoteControlConnectionsState?.authRequired ? (
                  <div className="p-3 text-sm text-token-text-secondary">
                    <FormattedMessage
                      id="settings.remoteControlConnections.authRequired"
                      defaultMessage="Sign in to ChatGPT in Codex Desktop, then refresh to load remote control environments."
                      description="Message shown when remote control environments require desktop ChatGPT auth"
                    />
                  </div>
                ) : null}
                {!isRemoteConnectionsLoading &&
                !remoteControlConnectionsState?.authRequired &&
                remoteControlConnections.length === 0 ? (
                  <div className="p-3 text-sm text-token-text-secondary">
                    <FormattedMessage
                      id="settings.remoteControlConnections.empty"
                      defaultMessage="No remote control environments found yet."
                      description="Empty state for the remote control environments section"
                    />
                  </div>
                ) : null}
                {remoteControlConnections.length > 0 ? (
                  <RemoteControlConnectionsTable
                    connections={remoteControlConnections}
                    disabled={isMutatingRemoteConnection}
                    onToggleConnection={handleAutoConnectChange}
                  />
                ) : null}
              </SettingsSurface>
            </SettingsGroup.Content>
          </SettingsGroup>
        ) : null}
      </SettingsContentLayout>

      <RemoteConnectionEditorDialog
        open={editorState != null}
        mode={editorState?.mode ?? "add"}
        draft={editorState?.draft ?? createEmptyDraft()}
        existingConnections={remoteConnections}
        editingHostId={editorState?.mode === "edit" ? editorState.hostId : null}
        onOpenChange={(open) => {
          if (!open) {
            setEditorState(null);
          }
        }}
        onChange={handleModalDraftChange}
        onSubmit={handleModalSubmit}
        isSaving={saveCodexManagedConnectionsMutation.isPending}
      />

      <RemoteConnectionAuthDialog
        hostId={authenticatingHostId}
        open={authenticatingHostId != null}
        onOpenChange={(open) => {
          if (!open) {
            setAuthenticatingHostId(null);
          }
        }}
      />
    </>
  );
}

function RemoteConnectionsTable({
  connections,
  disabled,
  onAddConnection,
  onRefresh,
  onEdit,
  onRemove,
  onToggleConnection,
  onAuthenticate,
}: {
  connections: Array<RemoteSshConnection>;
  disabled: boolean;
  onAddConnection: () => void;
  onRefresh: () => void;
  onEdit: (hostId: string) => void;
  onRemove: (hostId: string) => void;
  onToggleConnection: (hostId: string, autoConnect: boolean) => void;
  onAuthenticate: (hostId: string) => void;
}): ReactElement {
  const intl = useIntl();
  const sortedConnections = [...connections].sort((left, right) => {
    if (left.source !== right.source) {
      return left.source === "codex-managed" ? -1 : 1;
    }
    return compareRemoteConnectionsByDisplayName(left, right);
  });
  const refreshLabel = intl.formatMessage({
    id: "settings.remoteConnections.refresh",
    defaultMessage: "Refresh",
    description: "Button label to refresh remote SSH connections",
  });
  const addConnectionLabel = intl.formatMessage({
    id: "settings.remoteConnections.add",
    defaultMessage: "Add new connection",
    description: "Button label to manually add a remote connection",
  });

  return (
    <div className="min-w-0">
      <table className="w-full table-fixed border-collapse text-sm">
        <thead className="bg-token-foreground/5">
          <tr>
            <th className="w-[20%] px-4 py-3 text-left font-medium">
              <FormattedMessage
                id="settings.remoteConnections.table.displayName"
                defaultMessage="Display name / Alias"
                description="Column header for remote connections display name or alias"
              />
            </th>
            <th className="w-[30%] px-4 py-3 text-left font-medium">
              <FormattedMessage
                id="settings.remoteConnections.table.sshAlias"
                defaultMessage="HostName"
                description="Column header for remote connections SSH hostname"
              />
            </th>
            <th className="w-[70px] px-4 py-3 text-left font-medium">
              <FormattedMessage
                id="settings.remoteConnections.table.sshPort"
                defaultMessage="Port"
                description="Column header for remote connections SSH port"
              />
            </th>
            <th className="w-[30%] px-4 py-3 text-left font-medium">
              <FormattedMessage
                id="settings.remoteConnections.table.identity"
                defaultMessage="Identity"
                description="Column header for remote connections SSH identity file"
              />
            </th>
            <th className="w-[9rem] px-4 py-3 text-left font-medium whitespace-nowrap">
              <FormattedMessage
                id="settings.remoteConnections.table.status"
                defaultMessage="Status"
                description="Column header for remote connection status"
              />
            </th>
            <th className="w-20 px-4 py-3 text-left font-medium whitespace-nowrap">
              <FormattedMessage
                id="settings.remoteConnections.table.autoConnect"
                defaultMessage="Connect"
                description="Column header for remote connection state toggle"
              />
            </th>
            <th className="w-[5.5rem] py-2">
              <div className="flex items-center">
                <div className="size-8" />
                <Tooltip tooltipContent={refreshLabel}>
                  <Button
                    aria-label={refreshLabel}
                    color="ghost"
                    size="icon"
                    className="-translate-x-1"
                    onClick={onRefresh}
                  >
                    <RegenerateIcon className="icon-xs" />
                  </Button>
                </Tooltip>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedConnections.length === 0 ? (
            <tr className="border-t border-token-border-default">
              <td
                colSpan={7}
                className="px-4 py-4 text-sm text-token-text-secondary"
              >
                <FormattedMessage
                  id="settings.remoteConnections.empty"
                  defaultMessage="No SSH connections found. Add a new connection to get started."
                  description="Empty state for the remote connections settings page"
                />
              </td>
            </tr>
          ) : null}
          {sortedConnections.map((connection) => {
            return (
              <tr
                key={connection.hostId}
                className="border-t border-token-border-default align-middle"
              >
                <td className="px-4 py-3.5">
                  <RemoteConnectionsTruncatedCellText
                    value={
                      connection.sshAlias?.trim() ||
                      connection.displayName.trim()
                    }
                  />
                </td>
                <td className="px-4 py-3.5">
                  <RemoteConnectionsTruncatedCellText
                    value={connection.sshHost}
                  />
                </td>
                <td className="px-4 py-3.5">
                  <div className="truncate">
                    {connection.sshPort == null
                      ? EMPTY_CELL_PLACEHOLDER
                      : String(connection.sshPort)}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <RemoteConnectionsTruncatedCellText
                    value={connection.identity}
                    placeholder={EMPTY_CELL_PLACEHOLDER}
                  />
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <AppServerConnectionStateBadge
                    hostId={connection.hostId}
                    onUnauthedClick={() => onAuthenticate(connection.hostId)}
                  />
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex justify-center">
                    <Toggle
                      checked={connection.autoConnect}
                      size="sm"
                      onChange={(checked) =>
                        onToggleConnection(connection.hostId, checked)
                      }
                      ariaLabel={intl.formatMessage(
                        {
                          id: "settings.remoteConnections.table.autoConnect.ariaLabel",
                          defaultMessage: "Connect {connectionName}",
                          description:
                            "Screen reader label for the remote connection toggle",
                        },
                        { connectionName: connection.displayName },
                      )}
                    />
                  </div>
                </td>
                <td className="py-3.5 whitespace-nowrap">
                  <div className="justify-left flex items-center">
                    <Tooltip
                      tooltipContent={
                        connection.source === "codex-managed"
                          ? intl.formatMessage({
                              id: "settings.remoteConnections.edit",
                              defaultMessage: "Edit",
                              description:
                                "Button label to edit a remote connection",
                            })
                          : intl.formatMessage({
                              id: "settings.remoteConnections.cantEdit",
                              defaultMessage:
                                "Discovered connections cannot be edited",
                              description:
                                "Button label that displays a tooltip that discovered connections cannot be edited",
                            })
                      }
                    >
                      <Button
                        aria-label={intl.formatMessage({
                          id: "settings.remoteConnections.edit",
                          defaultMessage: "Edit",
                          description:
                            "Button label to edit a remote connection",
                        })}
                        color="ghost"
                        size="icon"
                        disabled={
                          disabled || connection.source === "discovered"
                        }
                        onClick={() => onEdit(connection.hostId)}
                      >
                        <PencilIcon className="icon-xs" />
                      </Button>
                    </Tooltip>
                    <Tooltip
                      tooltipContent={
                        connection.source === "codex-managed"
                          ? intl.formatMessage({
                              id: "settings.remoteConnections.remove",
                              defaultMessage: "Remove",
                              description:
                                "Button label to remove a remote connection",
                            })
                          : intl.formatMessage({
                              id: "settings.remoteConnections.cantRemove",
                              defaultMessage:
                                "Discovered connections cannot be removed",
                              description:
                                "Button label that displays a tooltip that discovered connections cannot be removed",
                            })
                      }
                    >
                      <Button
                        aria-label={intl.formatMessage({
                          id: "settings.remoteConnections.remove",
                          defaultMessage: "Remove",
                          description:
                            "Button label to remove a remote connection",
                        })}
                        color="ghost"
                        size="icon"
                        disabled={
                          disabled || connection.source === "discovered"
                        }
                        onClick={() => onRemove(connection.hostId)}
                      >
                        <TrashIcon className="icon-xs text-token-charts-red" />
                      </Button>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            );
          })}
          <tr className="border-t border-token-border-default">
            <td colSpan={7} className="px-4 py-3">
              <div className="flex justify-center">
                <Tooltip tooltipContent={addConnectionLabel}>
                  <Button
                    aria-label={addConnectionLabel}
                    color="secondary"
                    size="icon"
                    onClick={onAddConnection}
                    disabled={disabled}
                  >
                    <PlusIcon className="icon-xs" />
                  </Button>
                </Tooltip>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function RemoteControlConnectionsTable({
  connections,
  disabled,
  onToggleConnection,
}: {
  connections: Array<RemoteControlConnection>;
  disabled: boolean;
  onToggleConnection: (hostId: string, autoConnect: boolean) => void;
}): ReactElement {
  const intl = useIntl();

  return (
    <div className="min-w-0">
      <table className="w-full table-fixed border-collapse text-sm">
        <thead className="bg-token-foreground/5">
          <tr>
            <th className="w-[22%] px-4 py-3 text-left font-medium">
              <FormattedMessage
                id="settings.remoteControlConnections.table.name"
                defaultMessage="Name"
                description="Column header for the remote control environment name"
              />
            </th>
            <th className="w-[12%] px-4 py-3 text-left font-medium">
              <FormattedMessage
                id="settings.remoteControlConnections.table.availability"
                defaultMessage="Availability"
                description="Column header for the remote control environment availability"
              />
            </th>
            <th className="w-[16%] px-4 py-3 text-left font-medium">
              <FormattedMessage
                id="settings.remoteControlConnections.table.platform"
                defaultMessage="OS / arch"
                description="Column header for the remote control environment OS and architecture"
              />
            </th>
            <th className="w-[14%] px-4 py-3 text-left font-medium">
              <FormattedMessage
                id="settings.remoteControlConnections.table.version"
                defaultMessage="App-server version"
                description="Column header for the remote control environment app-server version"
              />
            </th>
            <th className="w-[10%] px-4 py-3 text-left font-medium">
              <FormattedMessage
                id="settings.remoteControlConnections.table.lastSeen"
                defaultMessage="Last seen"
                description="Column header for the remote control environment last seen time"
              />
            </th>
            <th className="w-[9rem] px-4 py-3 text-left font-medium whitespace-nowrap">
              <FormattedMessage
                id="settings.remoteControlConnections.table.status"
                defaultMessage="Connection state"
                description="Column header for the remote control environment connection state"
              />
            </th>
            <th className="w-20 px-4 py-3 text-left font-medium whitespace-nowrap">
              <FormattedMessage
                id="settings.remoteControlConnections.table.connect"
                defaultMessage="Connect"
                description="Column header for the remote control connection toggle"
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {connections.map((connection) => {
            return (
              <tr
                key={connection.hostId}
                className="border-t border-token-border-default align-middle"
              >
                <td className="px-4 py-3.5">
                  <RemoteConnectionsTruncatedCellText
                    value={connection.displayName}
                  />
                </td>
                <td className="px-4 py-3.5">
                  <div className="truncate">
                    {getRemoteControlAvailabilityLabel(connection)}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <RemoteConnectionsTruncatedCellText
                    value={formatRemoteControlPlatform(connection)}
                    placeholder={EMPTY_CELL_PLACEHOLDER}
                  />
                </td>
                <td className="px-4 py-3.5">
                  <RemoteConnectionsTruncatedCellText
                    value={connection.appServerVersion}
                    placeholder={EMPTY_CELL_PLACEHOLDER}
                  />
                </td>
                <td className="px-4 py-3.5">
                  <div className="truncate">
                    {connection.lastSeenAt ? (
                      <FormattedRelativeDateTime
                        dateString={connection.lastSeenAt}
                      />
                    ) : (
                      EMPTY_CELL_PLACEHOLDER
                    )}
                  </div>
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <AppServerConnectionStateBadge hostId={connection.hostId} />
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex justify-center">
                    <Toggle
                      checked={connection.autoConnect}
                      size="sm"
                      disabled={disabled}
                      onChange={(checked) =>
                        onToggleConnection(connection.hostId, checked)
                      }
                      ariaLabel={intl.formatMessage(
                        {
                          id: "settings.remoteControlConnections.table.connect.ariaLabel",
                          defaultMessage: "Connect {connectionName}",
                          description:
                            "Screen reader label for the remote control connection toggle",
                        },
                        { connectionName: connection.displayName },
                      )}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RemoteConnectionEditorDialogInput({
  label,
  description,
  value,
  placeholder,
  onChange,
  disabled = false,
}: {
  label: string;
  description?: ReactNode;
  value: string;
  placeholder?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  disabled?: boolean;
}): ReactElement {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-token-text-secondary">{label}</span>
      <input
        className="w-full rounded-md border border-token-input-border bg-token-input-background px-2.5 py-1.5 text-sm text-token-input-foreground outline-none placeholder:text-token-input-placeholder-foreground focus:border-token-focus-border disabled:bg-token-foreground/5 disabled:text-token-text-secondary disabled:opacity-100"
        value={value}
        disabled={disabled}
        onChange={onChange}
        placeholder={placeholder}
      />
      {description ? (
        <span className="text-xs text-token-text-secondary">{description}</span>
      ) : null}
    </label>
  );
}

function RemoteConnectionEditorDialog({
  open,
  mode,
  draft,
  existingConnections,
  editingHostId,
  onOpenChange,
  onChange,
  onSubmit,
  isSaving,
}: {
  open: boolean;
  mode: "add" | "edit";
  draft: RemoteConnectionDraft;
  existingConnections: Array<RemoteConnection>;
  editingHostId: string | null;
  onOpenChange: (open: boolean) => void;
  onChange: (
    updater: (draft: RemoteConnectionDraft) => RemoteConnectionDraft,
  ) => void;
  onSubmit: () => void;
  isSaving: boolean;
}): ReactElement {
  const intl = useIntl();
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);

  useEffect(() => {
    if (open) {
      setHasAttemptedSave(false);
    }
  }, [open]);

  const validationErrors = validateDraft(
    draft,
    existingConnections,
    editingHostId,
  );
  const showErrors =
    !isSaving && hasAttemptedSave && validationErrors.length > 0;

  const handleSubmit = (): void => {
    setHasAttemptedSave(true);
    if (validationErrors.length > 0 || isSaving) {
      return;
    }
    onSubmit();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setHasAttemptedSave(false);
        onOpenChange(nextOpen);
      }}
      size="compact"
    >
      <form
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <DialogBody>
          <DialogSection>
            <DialogHeader
              title={
                mode === "add" ? (
                  <FormattedMessage
                    id="settings.remoteConnections.dialog.addTitle"
                    defaultMessage="Add connection"
                    description="Title for add remote connection dialog"
                  />
                ) : (
                  <FormattedMessage
                    id="settings.remoteConnections.dialog.editTitle"
                    defaultMessage="Edit connection"
                    description="Title for edit remote connection dialog"
                  />
                )
              }
            />
          </DialogSection>

          {showErrors ? (
            <DialogSection>
              <div className="border-token-border-error rounded-md border p-2 text-sm text-token-error-foreground">
                {validationErrors.map((error, index) => (
                  <div key={`editor-error-${index}`}>{error}</div>
                ))}
              </div>
            </DialogSection>
          ) : null}

          <DialogSection>
            <div className="grid grid-cols-1 gap-3">
              <RemoteConnectionEditorDialogInput
                label={intl.formatMessage({
                  id: "settings.remoteConnections.dialog.field.displayName",
                  defaultMessage: "Display name",
                  description:
                    "Label for display name field in remote connection editor dialog",
                })}
                value={draft.displayName}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  onChange((currentDraft) => ({
                    ...currentDraft,
                    displayName: nextValue,
                  }));
                }}
                disabled={isSaving}
              />

              <RemoteConnectionEditorDialogInput
                label={intl.formatMessage({
                  id: "settings.remoteConnections.dialog.field.sshHost",
                  defaultMessage: "HostName",
                  description:
                    "Label for SSH target field in remote connection editor dialog",
                })}
                placeholder={intl.formatMessage({
                  id: "settings.remoteConnections.dialog.field.sshHost.placeholder",
                  defaultMessage: "host.com or user@host.com",
                  description:
                    "Placeholder for SSH target field in remote connection editor dialog",
                })}
                value={draft.sshHost}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  onChange((currentDraft) => ({
                    ...currentDraft,
                    sshHost: nextValue,
                  }));
                }}
                disabled={isSaving}
              />

              <RemoteConnectionEditorDialogInput
                label={intl.formatMessage({
                  id: "settings.remoteConnections.dialog.field.sshPort",
                  defaultMessage: "SSH port (optional)",
                  description:
                    "Label for optional SSH port field in remote connection editor dialog",
                })}
                value={draft.sshPort}
                placeholder={"22"}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  onChange((currentDraft) => ({
                    ...currentDraft,
                    sshPort: nextValue,
                  }));
                }}
                disabled={isSaving}
              />

              <RemoteConnectionEditorDialogInput
                label={intl.formatMessage({
                  id: "settings.remoteConnections.dialog.field.identity",
                  defaultMessage: "Identity file (optional)",
                  description:
                    "Label for optional identity file field in remote connection editor dialog",
                })}
                value={draft.identity}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  onChange((currentDraft) => ({
                    ...currentDraft,
                    identity: nextValue,
                  }));
                }}
                disabled={isSaving}
              />
            </div>
          </DialogSection>

          <DialogSection>
            <DialogFooter>
              <Button
                color="ghost"
                type="button"
                disabled={isSaving}
                onClick={() => onOpenChange(false)}
              >
                <FormattedMessage
                  id="settings.remoteConnections.dialog.cancel"
                  defaultMessage="Cancel"
                  description="Cancel button for remote connection editor dialog"
                />
              </Button>
              <Button color="primary" type="submit" loading={isSaving}>
                <FormattedMessage
                  id="settings.remoteConnections.dialog.apply"
                  defaultMessage="Save"
                  description="Save button for remote connection editor dialog"
                />
              </Button>
            </DialogFooter>
          </DialogSection>
        </DialogBody>
      </form>
    </Dialog>
  );
}

function createEmptyDraft(): RemoteConnectionDraft {
  return {
    displayName: "",
    sshHost: "",
    sshPort: "",
    identity: "",
  };
}

function toDraft(connection: RemoteSshConnection): RemoteConnectionDraft {
  return {
    displayName: connection.displayName,
    sshHost: connection.sshAlias?.trim() || connection.sshHost,
    sshPort: connection.sshPort == null ? "" : String(connection.sshPort),
    identity: connection.identity ?? "",
  };
}

function parseSshPort(portInput: string): number | null {
  const trimmedPortInput = portInput.trim();
  if (trimmedPortInput.length === 0) {
    return null;
  }
  if (!/^\d+$/.test(trimmedPortInput)) {
    return null;
  }

  const parsedPort = Number(trimmedPortInput);
  if (!Number.isSafeInteger(parsedPort)) {
    return null;
  }
  return parsedPort;
}

function toCodexManagedRemoteSshConnection(
  draft: RemoteConnectionDraft,
  autoConnect: boolean,
): RemoteSshConnection {
  const displayName = draft.displayName.trim();
  return {
    hostId: buildCodexManagedRemoteConnectionHostId(displayName),
    displayName,
    source: "codex-managed",
    autoConnect,
    sshAlias: null,
    sshHost: draft.sshHost.trim(),
    sshPort: parseSshPort(draft.sshPort),
    identity: draft.identity.trim().length === 0 ? null : draft.identity.trim(),
  };
}

function validateDraft(
  draft: RemoteConnectionDraft,
  existingConnections: Array<RemoteConnection>,
  editingHostId: string | null,
): Array<ReactNode> {
  const validationErrors: Array<ReactNode> = [];
  const trimmedDisplayName = draft.displayName.trim();
  if (trimmedDisplayName.length === 0) {
    validationErrors.push(
      <FormattedMessage
        id="settings.remoteConnections.dialog.field.displayName.error"
        defaultMessage="Display name is required."
        description="Error message for display name field in remote connection editor dialog"
      />,
    );
  }
  if (draft.sshHost.trim().length === 0) {
    validationErrors.push(
      <FormattedMessage
        id="settings.remoteConnections.dialog.field.sshHost.error"
        defaultMessage="Alias or HostName is required."
        description="Error message for SSH target field in remote connection editor dialog"
      />,
    );
  }

  const trimmedPort = draft.sshPort.trim();
  if (trimmedPort.length > 0) {
    if (!/^\d+$/.test(trimmedPort)) {
      validationErrors.push(
        <FormattedMessage
          id="settings.remoteConnections.dialog.field.sshPort.intError"
          defaultMessage="SSH port must be an integer."
          description="Error message for SSH port field when the input is not an integer"
        />,
      );
    } else {
      const parsedPort = Number(trimmedPort);
      if (
        !Number.isSafeInteger(parsedPort) ||
        parsedPort < 1 ||
        parsedPort > 65535
      ) {
        validationErrors.push(
          <FormattedMessage
            id="settings.remoteConnections.dialog.field.sshPort.rangeError"
            defaultMessage="SSH port must be between 1 and 65535."
            description="Error message for SSH port field when the input is not between 1 and 65535"
          />,
        );
      }
    }
  }

  const hasDuplicateAlias = existingConnections.some((connection) => {
    if (editingHostId != null && connection.hostId === editingHostId) {
      return false;
    }
    return connection.displayName.trim() === trimmedDisplayName;
  });
  if (hasDuplicateAlias) {
    validationErrors.push(
      <FormattedMessage
        id="settings.remoteConnections.dialog.field.displayName.duplicateError"
        defaultMessage="A connection with this display name already exists."
        description="Error message for duplicate display name in the remote connection editor dialog"
      />,
    );
  }

  return validationErrors;
}

function getRemoteControlAvailabilityLabel(
  connection: RemoteControlConnection,
): string {
  if (!connection.online) {
    return "offline";
  }
  if (connection.busy) {
    return "busy";
  }
  return "online";
}

function formatRemoteControlPlatform(
  connection: RemoteControlConnection,
): string | null {
  const parts = [connection.os, connection.arch].filter((part) => {
    return part.trim().length > 0;
  });
  return parts.length > 0 ? parts.join(" / ") : null;
}

function compareRemoteConnectionsByDisplayName(
  left: { displayName: string },
  right: { displayName: string },
): number {
  return left.displayName.localeCompare(right.displayName);
}
