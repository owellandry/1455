import type { RemoteConnection } from "protocol";

import { useSharedObject } from "@/shared-objects/use-shared-object";

export function useEnabledRemoteConnections(): {
  remoteConnections: Array<RemoteConnection>;
  enabledRemoteHostIdSet: Set<string>;
} {
  const [remoteConnectionsData] = useSharedObject("remote_connections");
  const remoteConnections = remoteConnectionsData ?? [];

  return {
    remoteConnections,
    enabledRemoteHostIdSet: new Set(
      remoteConnections.flatMap((connection) => {
        return connection.autoConnect ? [connection.hostId] : [];
      }),
    ),
  };
}
