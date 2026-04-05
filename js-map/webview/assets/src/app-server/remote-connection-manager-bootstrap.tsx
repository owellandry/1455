import { useScope } from "maitai";
import type { ReactElement } from "react";
import { useEffect } from "react";

import { AppScope } from "@/scopes/app-scope";
import { useSharedObject } from "@/shared-objects/use-shared-object";
import { logger } from "@/utils/logger";
import { fetchFromVSCode } from "@/vscode-api";

import { AppServerManager } from "./app-server-manager";
import { useAppServerRegistry } from "./app-server-manager-hooks";

const REMOTE_CONNECTIONS_BOOTSTRAP_LOG_PREFIX =
  "[remote-connections/bootstrap]";

export function RemoteConnectionManagerBootstrap(): ReactElement | null {
  const scope = useScope(AppScope);
  const appServerRegistry = useAppServerRegistry();
  const [remoteConnections] = useSharedObject("remote_connections");

  useEffect(() => {
    const connections = remoteConnections ?? [];
    logger.info(
      `${REMOTE_CONNECTIONS_BOOTSTRAP_LOG_PREFIX} shared_object_synced`,
      {
        safe: {
          connectionCount: connections.length,
        },
        sensitive: {},
      },
    );
    for (const connection of connections) {
      const existingManager = appServerRegistry.getForHostId(connection.hostId);
      const manager =
        existingManager ??
        new AppServerManager(connection.hostId, scope.queryClient);
      if (existingManager == null) {
        appServerRegistry.addManager(manager);

        if (connection.autoConnect) {
          void manager.refreshRecentConversations().catch(() => {});
        }

        void fetchFromVSCode("app-server-connection-state", {
          params: { hostId: connection.hostId },
        })
          .then(({ state, errorMessage }) => {
            if (appServerRegistry.getForHostId(connection.hostId) === manager) {
              manager.setConnectionState(
                state ?? "disconnected",
                errorMessage,
                "bootstrap_connection_state_fetch",
              );
              appServerRegistry.notifyRegistryChanged();
            } else {
              logger.info(
                `${REMOTE_CONNECTIONS_BOOTSTRAP_LOG_PREFIX} initial_connection_state_ignored_for_stale_manager`,
                {
                  safe: {
                    state: state ?? "disconnected",
                  },
                  sensitive: { hostId: connection.hostId },
                },
              );
            }
          })
          .catch((error) => {
            logger.warning(
              `${REMOTE_CONNECTIONS_BOOTSTRAP_LOG_PREFIX} initial_connection_state_failed`,
              {
                safe: {},
                sensitive: { error, hostId: connection.hostId },
              },
            );
          });
      }
    }

    for (const manager of appServerRegistry.getAll()) {
      if (
        manager !== appServerRegistry.getDefault() &&
        !connections.some((connection) => {
          return connection.hostId === manager.getHostId();
        })
      ) {
        appServerRegistry.deleteManager(manager.getHostId());
      }
    }
  }, [appServerRegistry, remoteConnections, scope.queryClient]);

  return null;
}
