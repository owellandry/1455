import {
  isRemoteSshConnection,
  sshConnectionToHostConfig,
  type HostConfig,
  type RemoteConnection,
  type RemoteSshConnection,
} from "protocol";

import type { PendingWorktree } from "./pending-worktree-store";

type HostScopedManager = {
  getHostId(): string;
};

type HostScopedAppServerRegistry<Manager extends HostScopedManager> = {
  getDefault: () => Manager;
  getForConversationId: (
    conversationId: NonNullable<PendingWorktree["sourceConversationId"]>,
  ) => Manager;
  getForHostId: (hostId: string) => Manager | null;
};

export function getPendingWorktreeAppServerManager<
  Manager extends HostScopedManager,
>(
  appServerRegistry: HostScopedAppServerRegistry<Manager>,
  pendingWorktree: PendingWorktree | null | undefined,
): Manager | null {
  const defaultAppServerManager = appServerRegistry.getDefault();
  if (pendingWorktree == null) {
    return defaultAppServerManager;
  }
  if (pendingWorktree.sourceConversationId != null) {
    return appServerRegistry.getForConversationId(
      pendingWorktree.sourceConversationId,
    );
  }
  if (pendingWorktree.hostId === defaultAppServerManager.getHostId()) {
    return defaultAppServerManager;
  }
  return appServerRegistry.getForHostId(pendingWorktree.hostId);
}

export function getPendingWorktreeHostConfig(
  pendingWorktree: PendingWorktree | null | undefined,
  defaultHostConfig: HostConfig,
  remoteConnections: Array<RemoteConnection> | undefined,
): HostConfig | null {
  if (
    pendingWorktree == null ||
    pendingWorktree.hostId === defaultHostConfig.id
  ) {
    return defaultHostConfig;
  }
  const remoteConnection = remoteConnections?.find(
    (connection): connection is RemoteSshConnection => {
      return (
        connection.hostId === pendingWorktree.hostId &&
        isRemoteSshConnection(connection)
      );
    },
  );
  return remoteConnection == null
    ? null
    : sshConnectionToHostConfig(remoteConnection);
}
