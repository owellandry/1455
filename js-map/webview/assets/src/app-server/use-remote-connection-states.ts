import type { AppServerConnectionState } from "protocol";
import { useRef, useSyncExternalStore } from "react";

import { useAppServerRegistry } from "./app-server-manager-hooks";

export function useRemoteConnectionStates(
  connections: Array<{
    hostId: string;
  }>,
): Record<string, AppServerConnectionState> {
  const appServerRegistry = useAppServerRegistry();
  const cachedStatesRef = useRef<Record<string, AppServerConnectionState>>({});

  return useSyncExternalStore(
    (onStoreChange): (() => void) => {
      return appServerRegistry.addRegistryCallback(() => {
        onStoreChange();
      });
    },
    () => {
      const nextStates = Object.fromEntries(
        connections.map((connection) => [
          connection.hostId,
          appServerRegistry
            .getForHostId(connection.hostId)
            ?.getConnectionState() ?? "disconnected",
        ]),
      );

      const cachedStates = cachedStatesRef.current;
      const hostIds = Object.keys(nextStates);
      if (
        Object.keys(cachedStates).length === hostIds.length &&
        hostIds.every((hostId) => cachedStates[hostId] === nextStates[hostId])
      ) {
        return cachedStates;
      }

      cachedStatesRef.current = nextStates;
      return nextStates;
    },
  );
}
