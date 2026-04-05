import type { AppServerConnectionState } from "protocol";
import { useCallback, useSyncExternalStore } from "react";

import type { AppServerManager } from "./app-server-manager";
import { useAppServerManagerForHost } from "./app-server-manager-hooks";

export function useAppServerConnectionState(hostId: string): {
  state: AppServerConnectionState | "error" | null;
  mostRecentErrorMessage: string | null;
} {
  const manager = useAppServerManagerForHost(hostId);
  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      return subscribeToConnectionState(manager, onStoreChange);
    },
    [manager],
  );
  const connectionState = useSyncExternalStore(subscribe, () => {
    return manager?.getConnectionState() ?? null;
  });
  const mostRecentErrorMessage = useSyncExternalStore(subscribe, () => {
    return manager?.getMostRecentErrorMessage()?.trim() ?? null;
  });

  return {
    state:
      mostRecentErrorMessage && connectionState === "disconnected"
        ? "error"
        : connectionState,
    mostRecentErrorMessage,
  };
}

function subscribeToConnectionState(
  manager: AppServerManager | null,
  onStoreChange: () => void,
): () => void {
  if (manager == null) {
    return () => {};
  }

  const unsubscribe = manager.addAnyConversationCallback(() => {
    onStoreChange();
  });

  return () => {
    unsubscribe();
  };
}
