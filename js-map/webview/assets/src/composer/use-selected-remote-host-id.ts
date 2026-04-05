import { GlobalStateKey, type RemoteConnection } from "protocol";
import { useEffect } from "react";

import { useRemoteConnectionStates } from "@/app-server/use-remote-connection-states";
import { useGlobalState } from "@/hooks/use-global-state";
import { sortRemoteConnectionsByState } from "@/remote-connections/sort-remote-connections-by-state";
import { useSharedObject } from "@/shared-objects/use-shared-object";
import { logger } from "@/utils/logger";

const REMOTE_CONNECTIONS_SELECTION_LOG_PREFIX =
  "[remote-connections/selection]";

export function useSelectedRemoteHostId(): {
  remoteConnections: Array<RemoteConnection>;
  selectedRemoteHostId: string | null;
  selectedRemoteConnection: RemoteConnection | null;
  setSelectedRemoteHostId: (hostId: string | null) => void;
} {
  const [remoteConnectionsData] = useSharedObject("remote_connections");
  const remoteConnections = remoteConnectionsData ?? [];
  const {
    data: persistedSelectedRemoteHostId,
    setData: setPersistedSelectedRemoteHostId,
  } = useGlobalState(GlobalStateKey.SELECTED_REMOTE_HOST_ID);
  const connectionStatesByHostId = useRemoteConnectionStates(remoteConnections);
  const sortedRemoteConnections = sortRemoteConnectionsByState(
    remoteConnections,
    connectionStatesByHostId,
  );
  const selectedRemoteHostId =
    remoteConnectionsData == null
      ? (persistedSelectedRemoteHostId ?? null)
      : (sortedRemoteConnections.find((connection) => {
          return connection.hostId === persistedSelectedRemoteHostId;
        })?.hostId ??
        sortedRemoteConnections[0]?.hostId ??
        null);
  const selectedRemoteConnection =
    sortedRemoteConnections.find((connection) => {
      return connection.hostId === selectedRemoteHostId;
    }) ?? null;

  useEffect(() => {
    if (remoteConnectionsData == null) {
      return;
    }
    if (persistedSelectedRemoteHostId === selectedRemoteHostId) {
      return;
    }
    logger.info(
      `${REMOTE_CONNECTIONS_SELECTION_LOG_PREFIX} persisted_selection_reconciled`,
      {
        safe: {
          availableConnectionCount: sortedRemoteConnections.length,
          selectedConnectionState:
            selectedRemoteConnection == null ? "cleared" : "selected",
        },
        sensitive: {
          persistedSelectedRemoteHostId,
          selectedRemoteHostId,
        },
      },
    );
    void setPersistedSelectedRemoteHostId(selectedRemoteHostId ?? undefined);
  }, [
    persistedSelectedRemoteHostId,
    remoteConnectionsData,
    selectedRemoteHostId,
    selectedRemoteConnection,
    setPersistedSelectedRemoteHostId,
    sortedRemoteConnections.length,
  ]);

  return {
    remoteConnections,
    selectedRemoteHostId,
    selectedRemoteConnection,
    setSelectedRemoteHostId: (hostId: string | null): void => {
      void setPersistedSelectedRemoteHostId(hostId ?? undefined);
    },
  };
}
