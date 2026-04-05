import type { ConversationId, RemoteProject } from "protocol";
import { useMemo } from "react";

import {
  useLocalConversationCwd,
  useLocalConversationSelector,
} from "@/app-server/app-server-manager-hooks";
import { useSelectedRemoteHostId } from "@/composer/use-selected-remote-host-id";
import { useSelectedRemoteProject } from "@/remote-projects/remote-projects";
import {
  DEFAULT_HOST_ID,
  getHostConfigForHostId,
} from "@/shared-objects/use-host-config";
import type { useHostConfig } from "@/shared-objects/use-host-config";
import { useSharedObject } from "@/shared-objects/use-shared-object";
import { useFetchFromVSCode } from "@/vscode-api";

export type ResolvedWebviewExecutionTarget = {
  cwd: string | null;
  hostId: string;
};

export function resolveWebviewExecutionTarget({
  activeWorkspaceRoot,
  conversationCwd,
  conversationHostId,
  selectedRemoteProject,
}: {
  activeWorkspaceRoot: string | null;
  conversationCwd: string | null;
  conversationHostId: string | null;
  selectedRemoteProject: RemoteProject | null;
}): ResolvedWebviewExecutionTarget {
  if (conversationCwd) {
    return {
      cwd: conversationCwd,
      hostId: conversationHostId ?? DEFAULT_HOST_ID,
    };
  }

  if (selectedRemoteProject != null) {
    return {
      cwd: selectedRemoteProject.remotePath,
      hostId: selectedRemoteProject.hostId,
    };
  }
  return {
    cwd: activeWorkspaceRoot,
    hostId: DEFAULT_HOST_ID,
  };
}

export function useWebviewExecutionTarget(
  conversationId: ConversationId | null = null,
): ResolvedWebviewExecutionTarget & {
  activeWorkspaceRoot: string | null;
  hostConfig: ReturnType<typeof useHostConfig>;
} {
  const conversationCwd = useLocalConversationCwd(conversationId);
  const conversationHostId = useLocalConversationSelector(
    conversationId,
    (conversation) => conversation?.hostId ?? null,
  );
  const { data: activeWorkspaceRootRaw } = useFetchFromVSCode(
    "active-workspace-roots",
    {
      select: (data): string | null => data.roots?.[0] ?? null,
    },
  );
  const { remoteConnections } = useSelectedRemoteHostId();
  const { selectedRemoteProject } = useSelectedRemoteProject();
  const [defaultHostConfig] = useSharedObject("host_config");

  const activeWorkspaceRoot = activeWorkspaceRootRaw ?? null;
  const resolved = useMemo(
    () =>
      resolveWebviewExecutionTarget({
        activeWorkspaceRoot,
        conversationCwd,
        conversationHostId,
        selectedRemoteProject,
      }),
    [
      activeWorkspaceRoot,
      conversationCwd,
      conversationHostId,
      selectedRemoteProject,
    ],
  );
  const hostConfig =
    defaultHostConfig && resolved.hostId === defaultHostConfig.id
      ? defaultHostConfig
      : getHostConfigForHostId(resolved.hostId, remoteConnections);

  return {
    activeWorkspaceRoot,
    hostConfig,
    ...resolved,
  };
}
