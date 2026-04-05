export type SshCapableRemoteHostKind = "ssh" | "brix";
export type RemoteControlHostKind = "remote-control";
export const REMOTE_CONTROL_HOST_KIND: RemoteControlHostKind = "remote-control";
export type RemoteHostKind = SshCapableRemoteHostKind | RemoteControlHostKind;
export type HostKind = "local" | RemoteHostKind;

export type HostWorkspace = {
  name: string;
  path: string;
};

export type HostAccentColorSet = {
  background: string;
};

export type HostAccentColors = {
  light?: HostAccentColorSet;
  dark?: HostAccentColorSet;
};

export type HostConfig = {
  id: string;
  display_name: string;
  kind: HostKind;
  codex_cli_command?: Array<string> | null;
  terminal_command?: Array<string> | null;
  default_workspaces?: Array<HostWorkspace>;
  home_dir?: string;
  websocket_url?: string;
  name?: string;
  accent_colors?: HostAccentColors;
  [key: string]: unknown;
};

export type SshCapableRemoteHostConfig = HostConfig & {
  kind: SshCapableRemoteHostKind;
  codex_cli_command: Array<string>;
  terminal_command: Array<string>;
};

export type RemoteControlHostConfig = HostConfig & {
  kind: RemoteControlHostKind;
  codex_cli_command: Array<string>;
  terminal_command: Array<string>;
  env_id: string;
  environment_kind: string;
  online: boolean;
  busy: boolean;
  os: string;
  arch: string;
  app_server_version: string;
  last_seen_at: string | null;
};

export type RemoteHostConfig =
  | SshCapableRemoteHostConfig
  | RemoteControlHostConfig;

export type RemoteSshConnectionSource = "codex-managed" | "discovered";
export type RemoteControlConnectionSource = "remote-control";
export type RemoteConnection = RemoteSshConnection | RemoteControlConnection;

export const DEFAULT_REMOTE_SSH_CONNECTION_AUTO_CONNECT = false;

export type RemoteSshConnection = {
  hostId: string;
  displayName: string;
  source: RemoteSshConnectionSource;
  autoConnect: boolean;
  sshAlias?: string | null;
  sshHost: string;
  sshPort: number | null;
  identity: string | null;
};

export type RemoteControlConnection = {
  hostId: string;
  displayName: string;
  autoConnect: boolean;
  source: RemoteControlConnectionSource;
  envId: string;
  environmentKind: string;
  online: boolean;
  busy: boolean;
  os: string;
  arch: string;
  appServerVersion: string;
  lastSeenAt: string | null;
};

export function buildCodexManagedRemoteConnectionHostId(
  displayName: string,
): string {
  return `remote-ssh-codex-managed:${encodeURIComponent(displayName)}`;
}

export function buildDiscoveredRemoteConnectionHostId(
  displayName: string,
): string {
  return `remote-ssh-discovered:${encodeURIComponent(displayName)}`;
}

export function buildRemoteControlConnectionHostId(envId: string): string {
  return `remote-control:${encodeURIComponent(envId)}`;
}

export function buildSshClientConnectionArgs({
  sshAlias,
  sshHost,
  sshPort,
  identity,
}: {
  sshAlias?: string | null;
  sshHost: string;
  sshPort: number | null;
  identity: string | null;
}): Array<string> {
  const trimmedSshAlias = sshAlias?.trim();
  if (trimmedSshAlias) {
    return [trimmedSshAlias];
  }

  const args: Array<string> = [];
  if (identity) {
    args.push("-i", identity);
  }
  if (sshPort != null) {
    args.push("-p", String(sshPort));
  }
  args.push(sshHost);
  return args;
}

export function getRemoteSshConnectionsFromSource(
  connections: Array<RemoteConnection> | undefined,
  source: RemoteSshConnectionSource,
): Array<RemoteSshConnection> {
  return (connections ?? []).filter(
    (connection): connection is RemoteSshConnection => {
      return isRemoteSshConnection(connection) && connection.source === source;
    },
  );
}

export function getRemoteControlConnections(
  connections: Array<RemoteConnection> | undefined,
): Array<RemoteControlConnection> {
  return (connections ?? []).filter(
    (connection): connection is RemoteControlConnection => {
      return isRemoteControlConnection(connection);
    },
  );
}

export function isRemoteSshConnection(
  connection: RemoteConnection,
): connection is RemoteSshConnection {
  return (
    connection.source === "codex-managed" || connection.source === "discovered"
  );
}

export function isRemoteControlConnection(
  connection: RemoteConnection,
): connection is RemoteControlConnection {
  return connection.source === "remote-control";
}

export function isRemoteControlHostConfig(
  hostConfig: HostConfig | null,
): hostConfig is RemoteControlHostConfig {
  return hostConfig?.kind === REMOTE_CONTROL_HOST_KIND;
}

export function isSshCapableRemoteHostConfig(
  hostConfig: HostConfig | null,
): hostConfig is SshCapableRemoteHostConfig {
  if (hostConfig == null) {
    return false;
  }
  return hostConfig.kind === "ssh" || hostConfig.kind === "brix";
}

export function isRemoteHostConfig(
  hostConfig: HostConfig | null,
): hostConfig is RemoteHostConfig {
  return (
    isSshCapableRemoteHostConfig(hostConfig) ||
    isRemoteControlHostConfig(hostConfig)
  );
}

export function sshConnectionToHostConfig(
  connection: RemoteSshConnection,
): SshCapableRemoteHostConfig {
  const terminalCommand = [
    "ssh",
    ...buildSshClientConnectionArgs({
      sshAlias: connection.sshAlias,
      sshHost: connection.sshHost,
      sshPort: connection.sshPort,
      identity: connection.identity,
    }),
  ];
  return {
    id: connection.hostId,
    display_name: connection.displayName,
    kind: "ssh",
    codex_cli_command: [],
    terminal_command: terminalCommand,
  };
}

export function remoteControlConnectionToHostConfig(
  connection: RemoteControlConnection,
): RemoteControlHostConfig {
  return {
    id: connection.hostId,
    display_name: connection.displayName,
    kind: REMOTE_CONTROL_HOST_KIND,
    codex_cli_command: [],
    terminal_command: [],
    env_id: connection.envId,
    environment_kind: connection.environmentKind,
    online: connection.online,
    busy: connection.busy,
    os: connection.os,
    arch: connection.arch,
    app_server_version: connection.appServerVersion,
    last_seen_at: connection.lastSeenAt,
  };
}

export function remoteConnectionToHostConfig(
  connection: RemoteConnection,
): RemoteHostConfig {
  return isRemoteControlConnection(connection)
    ? remoteControlConnectionToHostConfig(connection)
    : sshConnectionToHostConfig(connection);
}
