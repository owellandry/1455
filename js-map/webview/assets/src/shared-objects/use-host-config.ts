import {
  type HostConfig,
  type RemoteConnection,
  remoteConnectionToHostConfig,
} from "protocol";

import { useSharedObject } from "./use-shared-object";

export function useHostConfig(hostId: string): HostConfig {
  const [remoteConnections] = useSharedObject("remote_connections");
  const [defaultHostConfig] = useSharedObject("host_config");

  if (hostId === defaultHostConfig?.id) {
    return defaultHostConfig ?? defaultHostConfigFallback;
  }
  return getHostConfigForHostId(hostId, remoteConnections);
}

export const FALLBACK_DEFAULT_HOST_ID = "local";

function getHostIdFromUrl(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = new URL(window.location.href).searchParams.get("hostId");
  const hostId = raw?.trim();
  return hostId && hostId.length > 0 ? hostId : null;
}

export const DEFAULT_HOST_ID = getHostIdFromUrl() ?? FALLBACK_DEFAULT_HOST_ID;

const defaultHostConfigFallback: HostConfig = {
  id: DEFAULT_HOST_ID,
  display_name: "Local",
  kind: "local",
};

// Story args and static query fixtures cannot call hooks, so stories may use
// this exported fallback directly.
export const DEFAULT_HOST_CONFIG_FOR_STORIES = defaultHostConfigFallback;

export function getHostConfigForHostId(
  hostId: string,
  remoteConnections: Array<RemoteConnection> | null | undefined,
): HostConfig {
  const connection = remoteConnections?.find(
    (connection) => connection.hostId === hostId,
  );
  return connection
    ? remoteConnectionToHostConfig(connection)
    : defaultHostConfigFallback;
}
