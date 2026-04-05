import { useScope, useSignal } from "maitai";
import { useNavigate } from "react-router";

import { useIsRemoteHost } from "@/hooks/use-is-remote-host";
import { AppScope } from "@/scopes/app-scope";
import { useSharedObject } from "@/shared-objects/use-shared-object";
import { useGate } from "@/statsig/statsig";

import { hasSeenRemoteConnectionsHomeAnnouncement$ } from "./remote-connections-onboarding-signals";

export type RemoteConnectionsHomeAnnouncementState = {
  isEligible: boolean;
  isLoading: boolean;
  navigate: ReturnType<typeof useNavigate>;
  scope: ReturnType<typeof useScope<typeof AppScope>>;
};

export function useRemoteConnectionsHomeAnnouncementState(): RemoteConnectionsHomeAnnouncementState {
  const navigate = useNavigate();
  const scope = useScope(AppScope);
  const hasSeenRemoteConnectionsHomeAnnouncement =
    useSignal(hasSeenRemoteConnectionsHomeAnnouncement$) ?? false;
  const remoteConnectionsEnabled = useGate(
    __statsigName("codex-app-enable-remote-connections"),
  );
  const isRemoteHost = useIsRemoteHost();
  const [remoteConnectionsData] = useSharedObject("remote_connections");
  const hasDiscoveredRemoteConnections =
    remoteConnectionsData?.some((connection) => {
      return connection.source === "discovered";
    }) ?? false;
  const isLoading =
    !hasSeenRemoteConnectionsHomeAnnouncement &&
    remoteConnectionsData === undefined;

  return {
    isEligible:
      !isLoading &&
      remoteConnectionsEnabled &&
      !isRemoteHost &&
      remoteConnectionsData != null &&
      !hasSeenRemoteConnectionsHomeAnnouncement &&
      hasDiscoveredRemoteConnections,
    isLoading,
    navigate,
    scope,
  };
}
