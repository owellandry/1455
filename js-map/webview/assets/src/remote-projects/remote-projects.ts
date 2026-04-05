import path from "path";

import { GlobalStateKey, type RemoteProject } from "protocol";
import { useEffect } from "react";

import { useGlobalState } from "@/hooks/use-global-state";
import { getComparableFsPath } from "@/utils/path";
import { useFetchFromVSCode } from "@/vscode-api";

export function getComparableRemoteProjectPath(remotePath: string): string {
  const comparablePath = getComparableFsPath(remotePath).replace(/\/+/g, "/");

  if (comparablePath === "/") {
    return comparablePath;
  }

  return comparablePath.replace(/\/+$/, "");
}

export function getRemoteProjectLabel(remotePath: string): string {
  const comparableRemotePath = getComparableRemoteProjectPath(remotePath);

  return path.posix.basename(comparableRemotePath) || comparableRemotePath;
}

export function findRemoteProjectForHostAndPath(
  projects: Array<RemoteProject>,
  hostId: string | undefined,
  remotePath: string,
): RemoteProject | null {
  if (hostId == null) {
    return null;
  }

  const comparableRemotePath = getComparableRemoteProjectPath(remotePath);

  return (
    projects.find((project) => {
      return (
        project.hostId === hostId &&
        getComparableRemoteProjectPath(project.remotePath) ===
          comparableRemotePath
      );
    }) ?? null
  );
}

export function useRemoteProjects(): {
  data: Array<RemoteProject> | undefined;
  isLoading: boolean;
  setData: (value: Array<RemoteProject> | undefined) => Promise<void>;
} {
  return useGlobalState(GlobalStateKey.REMOTE_PROJECTS);
}

export function useSelectedRemoteProject(): {
  selectedRemoteProject: RemoteProject | null;
  selectedRemoteProjectId: string | null;
  setSelectedRemoteProjectId: (projectId: string | null) => void;
  remoteProjects: Array<RemoteProject>;
  setRemoteProjects: (projects: Array<RemoteProject>) => Promise<void>;
} {
  const {
    data: remoteProjectsData,
    isLoading: remoteProjectsAreLoading,
    setData: setRemoteProjects,
  } = useRemoteProjects();
  const { data: selectedRemoteProjectId, setData: setSelectedRemoteProjectId } =
    useGlobalState(GlobalStateKey.ACTIVE_REMOTE_PROJECT_ID);
  const remoteProjects = remoteProjectsData ?? [];

  const selectedRemoteProject =
    remoteProjects.find((project) => {
      return project.id === selectedRemoteProjectId;
    }) ?? null;

  useEffect(() => {
    if (
      remoteProjectsAreLoading ||
      selectedRemoteProjectId == null ||
      selectedRemoteProject != null
    ) {
      return;
    }

    void setSelectedRemoteProjectId(undefined);
  }, [
    remoteProjectsAreLoading,
    selectedRemoteProject,
    selectedRemoteProjectId,
    setSelectedRemoteProjectId,
  ]);

  return {
    selectedRemoteProject,
    selectedRemoteProjectId: selectedRemoteProjectId ?? null,
    setSelectedRemoteProjectId: (projectId) => {
      void setSelectedRemoteProjectId(projectId ?? undefined);
    },
    remoteProjects,
    setRemoteProjects,
  };
}

export function useSelectedProject(): {
  activeWorkspaceRoot: string | null;
  selectedProjectId: string | null;
  selectedProjectKind: "local" | "remote";
  selectedRemoteProject: RemoteProject | null;
} {
  const { data: activeWorkspaceRoots } = useFetchFromVSCode(
    "active-workspace-roots",
  );
  const { selectedRemoteProject } = useSelectedRemoteProject();

  if (selectedRemoteProject != null) {
    return {
      activeWorkspaceRoot: activeWorkspaceRoots?.roots?.[0] ?? null,
      selectedProjectId: selectedRemoteProject.id,
      selectedProjectKind: "remote",
      selectedRemoteProject,
    };
  }

  return {
    activeWorkspaceRoot: activeWorkspaceRoots?.roots?.[0] ?? null,
    selectedProjectId: activeWorkspaceRoots?.roots?.[0] ?? null,
    selectedProjectKind: "local",
    selectedRemoteProject: null,
  };
}
