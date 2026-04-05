import type { ReactElement } from "react";
import { Navigate } from "react-router";

import { useGate } from "@/statsig/statsig";

export function RemoteConnectionsPage(): ReactElement {
  const remoteConnectionsEnabled = useGate(
    __statsigName("codex-app-enable-remote-connections"),
  );
  if (!remoteConnectionsEnabled) {
    return <Navigate to="/" replace />;
  }
  return <Navigate to="/settings/connections" replace />;
}
