import type { AppServerConnectionState } from "protocol";

const REMOTE_CONNECTION_STATE_ORDER: Record<AppServerConnectionState, number> =
  {
    connected: 0,
    unauthed: 1,
    connecting: 2,
    disconnected: 3,
  };

export function sortRemoteConnectionsByState<T extends { hostId: string }>(
  connections: Array<T>,
  connectionStatesByHostId: Record<string, AppServerConnectionState>,
): Array<T> {
  return [...connections]
    .map((connection, index) => ({ connection, index }))
    .sort((left, right) => {
      const leftOrder =
        REMOTE_CONNECTION_STATE_ORDER[
          connectionStatesByHostId[left.connection.hostId] ?? "disconnected"
        ];
      const rightOrder =
        REMOTE_CONNECTION_STATE_ORDER[
          connectionStatesByHostId[right.connection.hostId] ?? "disconnected"
        ];

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return left.index - right.index;
    })
    .map(({ connection }) => connection);
}
