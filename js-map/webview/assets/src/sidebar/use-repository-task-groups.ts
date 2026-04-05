import { keepPreviousData, useQueries } from "@tanstack/react-query";
import fromPairs from "lodash/fromPairs";
import groupBy from "lodash/groupBy";
import last from "lodash/last";
import uniq from "lodash/uniq";
import {
  GlobalStateKey,
  isCodexWorktree,
  type RemoteProject,
  type CodeEnvironment,
  type VSCodeFetchRequest,
} from "protocol";
import { useEffect, useEffectEvent } from "react";

import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import { useRemoteConnectionStates } from "@/app-server/use-remote-connection-states";
import { useCodexCloudAccess } from "@/auth/use-codex-cloud-access";
import { useEnvironments } from "@/codex-api";
import type {
  LocalMergedTask,
  MergedTask,
  PendingWorktreeTask,
  RemoteMergedTask,
} from "@/header/recent-tasks-menu/use-merge-tasks";
import { useGlobalState } from "@/hooks/use-global-state";
import { useEnabledRemoteConnections } from "@/remote-connections/remote-connection-visibility";
import {
  findRemoteProjectForHostAndPath,
  useRemoteProjects,
} from "@/remote-projects/remote-projects";
import { DEFAULT_HOST_ID } from "@/shared-objects/use-host-config";
import { logger } from "@/utils/logger";
import type { OwnerRepo } from "@/utils/parse-owner-repo";
import { parseOwnerRepo } from "@/utils/parse-owner-repo";
import { getComparableFsPath } from "@/utils/path";
import { fetchFromVSCode, getQueryKey, useFetchFromVSCode } from "@/vscode-api";

export type RepositoryData = {
  /** Remote info and name if there is a remote repo */
  ownerRepo: OwnerRepo | null;
  /** Path relative to repository root. eg "codex/codex-apps" */
  repoPath: string;
  /** Name of the repo root folder. eg "openai" */
  rootFolder: string;
};

export type RepositoryTaskGroups = {
  groupId?: string;
  projectId: string;
  projectKind: "local" | "remote";
  hostId?: string;
  hostDisplayName?: string | null;
  label: string;
  /** Full path of folder. */
  path: string;
  /** Info regarding git repository, only exists if workspace is a git repository */
  repositoryData: RepositoryData | null;
  /** Flag indicating this group represents a Codex-managed worktree root. */
  isCodexWorktree: boolean;
  /** List of all tasks in order of creation. */
  tasks: Array<MergedTask>;
};

export function getProjectIdsInSidebarOrder(
  groups: Array<RepositoryTaskGroups>,
  projectOrder: Array<string> | undefined,
): Array<string> {
  const knownProjectIds = new Set(groups.map((group) => group.projectId));
  const orderedProjectIds = (projectOrder ?? []).filter((projectId) =>
    knownProjectIds.has(projectId),
  );
  const seenProjectIds = new Set(orderedProjectIds);

  for (const group of groups) {
    if (seenProjectIds.has(group.projectId)) {
      continue;
    }

    orderedProjectIds.push(group.projectId);
    seenProjectIds.add(group.projectId);
  }

  return orderedProjectIds;
}

function sortProjectGroupsBySidebarOrder(
  groups: Array<RepositoryTaskGroups>,
  projectOrder: Array<string> | undefined,
): Array<RepositoryTaskGroups> {
  const orderedProjectIds = getProjectIdsInSidebarOrder(groups, projectOrder);
  const orderIndexByProjectId = new Map(
    orderedProjectIds.map((projectId, index) => [projectId, index]),
  );

  return [...groups].sort((firstGroup, secondGroup) => {
    return (
      (orderIndexByProjectId.get(firstGroup.projectId) ??
        Number.MAX_SAFE_INTEGER) -
      (orderIndexByProjectId.get(secondGroup.projectId) ??
        Number.MAX_SAFE_INTEGER)
    );
  });
}

export function shouldShowWorkspaceTaskGroupsLoadingState({
  isEnabled,
  workspaceRootOptionsIsLoading,
  gitOriginQueriesLoadingStates,
}: {
  isEnabled: boolean;
  workspaceRootOptionsIsLoading: boolean;
  gitOriginQueriesLoadingStates: Array<boolean>;
}): boolean {
  if (!isEnabled) {
    return false;
  }

  const loadingStates = [
    workspaceRootOptionsIsLoading,
    ...gitOriginQueriesLoadingStates,
  ];
  return loadingStates.length > 0 && loadingStates.every(Boolean);
}

/**
 * Group tasks under workspace roots with optional repo metadata:
 * - Build a group per workspace root and attach repositoryData from git-origins.
 * - Local tasks attach to their workspace root; codex worktrees map back to a matching root
 *   (same origin + repo-relative path) or the deepest non-worktree clone.
 * - Pending worktree tasks attach to their source workspace root.
 * - Remote tasks group by owner/repo (env label -> env -> clone url) and prefer a root whose
 *   repo path/root folder matches the repo name when multiple clones exist.
 */
export function useWorkspaceTaskGroups(
  tasks: Array<MergedTask> | null,
  options?: { enabled?: boolean },
): {
  groups: Array<RepositoryTaskGroups>;
  isWorkspaceRootOptionsLoading: boolean;
  workspaceRootOptions: Array<string> | undefined;
  workspaceRootLabels: Record<string, string>;
} {
  const isEnabled = options?.enabled ?? true;
  const appServerManager = useDefaultAppServerManager();
  const primaryHostId = appServerManager.getHostId();
  const { access: codexCloudAccess } = useCodexCloudAccess();
  const { data: cloudEnvironments } = useEnvironments({
    enabled: isEnabled && codexCloudAccess === "enabled",
  });
  const { data: codexHomeData } = useFetchFromVSCode("codex-home", {
    queryConfig: { enabled: isEnabled },
  });
  const {
    data: threadWorkspaceRootHints,
    setData: setThreadWorkspaceRootHints,
    isLoading: isThreadWorkspaceRootHintsLoading,
  } = useGlobalState(GlobalStateKey.THREAD_WORKSPACE_ROOT_HINTS);
  const { data: projectOrder } = useGlobalState(GlobalStateKey.PROJECT_ORDER);
  const {
    data: workspaceRootOptionsResponse,
    isLoading: isWorkspaceRootOptionsResponseLoading,
  } = useFetchFromVSCode("workspace-root-options", {
    select: (data) => data,
    queryConfig: { enabled: isEnabled },
  });
  const { data: remoteProjectsData, isLoading: remoteProjectsAreLoading } =
    useRemoteProjects();
  const { remoteConnections, enabledRemoteHostIdSet } =
    useEnabledRemoteConnections();
  const connectionStatesByHostId = useRemoteConnectionStates(remoteConnections);
  const codexHome = codexHomeData?.codexHome;
  const workspaceRootOptions = workspaceRootOptionsResponse?.roots;
  const workspaceRootLabels = workspaceRootOptionsResponse?.labels ?? {};
  const remoteProjects = remoteProjectsData ?? [];
  const enabledRemoteProjects = remoteProjects.filter((project) => {
    return enabledRemoteHostIdSet.has(project.hostId);
  });
  const discoveredThreadWorkspaceRootHints: Record<string, string> = {};
  const buildResult = (
    groups: Array<RepositoryTaskGroups>,
    isWorkspaceRootOptionsLoading: boolean,
  ): {
    groups: Array<RepositoryTaskGroups>;
    isWorkspaceRootOptionsLoading: boolean;
    workspaceRootOptions: Array<string> | undefined;
    workspaceRootLabels: Record<string, string>;
  } => ({
    groups,
    isWorkspaceRootOptionsLoading,
    workspaceRootOptions,
    workspaceRootLabels,
  });

  const gitOriginDirsByHostId = isEnabled
    ? getGitOriginDirsByHostId(
        tasks ?? [],
        primaryHostId,
        workspaceRootOptions,
        enabledRemoteProjects.filter((project) => {
          return connectionStatesByHostId[project.hostId] === "connected";
        }),
      )
    : [];
  const gitOriginQueries = useQueries({
    queries: gitOriginDirsByHostId.map(({ hostId, dirs }) => ({
      queryKey: getQueryKey("git-origins", { hostId, dirs }),
      queryFn: async (): Promise<
        VSCodeFetchRequest["git-origins"]["response"]
      > =>
        fetchFromVSCode("git-origins", {
          params: { hostId, dirs },
        }),
      placeholderData: keepPreviousData,
      enabled: isEnabled,
    })),
  });
  const gitOriginsByHostId = Object.fromEntries(
    gitOriginDirsByHostId.map(({ hostId }, index) => [
      hostId,
      gitOriginQueries[index]?.data?.origins ?? [],
    ]),
  );
  const primaryGitOriginsResult = gitOriginQueries[0]?.data;
  const allGitOrigins = Object.values(gitOriginsByHostId).flat();

  let result = buildResult([], false);
  if (isEnabled) {
    if (
      shouldShowWorkspaceTaskGroupsLoadingState({
        isEnabled,
        workspaceRootOptionsIsLoading: isWorkspaceRootOptionsResponseLoading,
        gitOriginQueriesLoadingStates: gitOriginQueries.map(
          (query) => query.isLoading,
        ),
      })
    ) {
      result = buildResult([], true);
    } else {
      const workspaceGroupsWithoutTasks = [
        ...createWorkspaceGroups(
          workspaceRootOptionsResponse,
          primaryGitOriginsResult?.origins ?? [],
          codexHome,
        ),
        ...createRemoteProjectGroups(enabledRemoteProjects, remoteConnections),
      ];
      const orderedGroupsWithoutTasks = sortProjectGroupsBySidebarOrder(
        workspaceGroupsWithoutTasks,
        projectOrder,
      );

      if (!tasks) {
        result = buildResult(orderedGroupsWithoutTasks, false);
      } else {
        const tasksByWorkspaceRoot = createRepositoryTaskGroups(
          tasks,
          cloudEnvironments,
          orderedGroupsWithoutTasks,
          allGitOrigins,
          codexHome,
          {
            gitOriginsByHostId,
            primaryHostId,
            remoteProjects: enabledRemoteProjects,
            remoteProjectsAreLoading,
            enabledRemoteHostIds: enabledRemoteHostIdSet,
            threadWorkspaceRootHints,
            onDiscoverThreadWorkspaceRootHint: (threadId, workspaceRoot) => {
              discoveredThreadWorkspaceRootHints[threadId] = workspaceRoot;
            },
          },
        );
        result = buildResult(tasksByWorkspaceRoot, false);
      }
    }
  }

  const discoveredThreadWorkspaceRootHintEntries = Object.entries(
    discoveredThreadWorkspaceRootHints,
  ).sort(([firstId], [secondId]) => firstId.localeCompare(secondId));
  const discoveredThreadWorkspaceRootHintEntriesKey = JSON.stringify(
    discoveredThreadWorkspaceRootHintEntries,
  );

  const updatePersistedWorkspaceRootHints = useEffectEvent(() => {
    if (isThreadWorkspaceRootHintsLoading) {
      return;
    }
    if (discoveredThreadWorkspaceRootHintEntriesKey === "[]") {
      return;
    }
    const discoveredEntries = JSON.parse(
      discoveredThreadWorkspaceRootHintEntriesKey,
    ) as Array<[string, string]>;
    const currentHints = threadWorkspaceRootHints ?? {};
    let didChange = false;
    const nextHints = { ...currentHints };
    for (const [threadId, workspaceRoot] of discoveredEntries) {
      if (nextHints[threadId] === workspaceRoot) {
        continue;
      }
      nextHints[threadId] = workspaceRoot;
      didChange = true;
    }
    if (!didChange) {
      return;
    }
    void setThreadWorkspaceRootHints(nextHints);
  });

  useEffect(() => {
    updatePersistedWorkspaceRootHints();
  }, [
    discoveredThreadWorkspaceRootHintEntriesKey,
    isThreadWorkspaceRootHintsLoading,
  ]);

  return result;
}

export function useWorkspaceGroups(): Array<RepositoryTaskGroups> {
  const { data: workspaceRootOptions } = useFetchFromVSCode(
    "workspace-root-options",
  );
  const { data: projectOrder } = useGlobalState(GlobalStateKey.PROJECT_ORDER);
  const { data: gitOrigins } = useFetchFromVSCode("git-origins");
  const { data: remoteProjectsData } = useRemoteProjects();
  const { remoteConnections, enabledRemoteHostIdSet } =
    useEnabledRemoteConnections();
  const { data: codexHome } = useFetchFromVSCode("codex-home", {
    select: (data): string | undefined => data?.codexHome,
  });
  const enabledRemoteProjects = (remoteProjectsData ?? []).filter((project) => {
    return enabledRemoteHostIdSet.has(project.hostId);
  });
  return sortProjectGroupsBySidebarOrder(
    [
      ...createWorkspaceGroups(
        workspaceRootOptions,
        gitOrigins?.origins ?? [],
        codexHome,
      ),
      ...createRemoteProjectGroups(enabledRemoteProjects, remoteConnections),
    ],
    projectOrder,
  );
}

export function createWorkspaceGroups(
  workspaceRootOptions:
    | VSCodeFetchRequest["workspace-root-options"]["response"]
    | undefined,
  gitOrigins: GitOrigin,
  codexHome?: string,
): Array<RepositoryTaskGroups> {
  const gitOriginByDir = fromPairs(
    gitOrigins.map((gitOrigin) => [
      getComparableFsPath(gitOrigin.dir),
      gitOrigin,
    ]),
  );
  return (workspaceRootOptions?.roots ?? []).map((workspaceRoot) => {
    const comparableWorkspaceRoot = getComparableFsPath(workspaceRoot);
    const codexWorktree = isCodexWorktree(workspaceRoot, codexHome);
    const labelOverride =
      workspaceRootOptions?.labels?.[workspaceRoot] ??
      workspaceRootOptions?.labels?.[comparableWorkspaceRoot] ??
      "";
    const label =
      labelOverride.trim() || last(pathSegments(workspaceRoot)) || "";
    const gitOrigin = gitOriginByDir[comparableWorkspaceRoot] ?? undefined;
    const ownerRepo = gitOrigin?.originUrl
      ? parseOwnerRepo(gitOrigin.originUrl)
      : null;
    if (gitOrigin) {
      const repoPath = getRepoRelativeSegmentsWithOrigin(
        workspaceRoot,
        gitOrigins,
      ).join("/");
      const repoData: RepositoryData = {
        ownerRepo,
        repoPath,
        rootFolder: last(pathSegments(gitOrigin.root)) ?? "",
      };
      return {
        projectId: workspaceRoot,
        projectKind: "local",
        label,
        path: workspaceRoot,
        repositoryData: repoData,
        isCodexWorktree: codexWorktree,
        tasks: [],
      };
    }
    return {
      projectId: workspaceRoot,
      projectKind: "local",
      label,
      path: workspaceRoot,
      repositoryData: null,
      isCodexWorktree: codexWorktree,
      tasks: [],
    };
  });
}

export function createRemoteProjectGroups(
  remoteProjects: Array<RemoteProject>,
  remoteConnections: Array<{ hostId: string; displayName: string }>,
): Array<RepositoryTaskGroups> {
  const hostDisplayNamesByHostId = new Map(
    remoteConnections.map((connection) => [
      connection.hostId,
      connection.displayName,
    ]),
  );

  return remoteProjects.map((project) => ({
    groupId: project.id,
    projectId: project.id,
    projectKind: "remote",
    hostId: project.hostId,
    hostDisplayName: hostDisplayNamesByHostId.get(project.hostId) ?? null,
    label: project.label,
    path: project.remotePath,
    repositoryData: null,
    isCodexWorktree: false,
    tasks: [],
  }));
}

export function createRepositoryTaskGroups(
  tasks: Array<MergedTask>,
  cloudEnvironments: Array<CodeEnvironment> | undefined,
  workspaceGroupsWithoutTasks: Array<RepositoryTaskGroups>,
  gitOrigins: GitOrigin | undefined,
  codexHome?: string,
  options?: {
    enabledRemoteHostIds?: Set<string>;
    gitOriginsByHostId?: Record<string, GitOrigin>;
    primaryHostId?: string;
    remoteProjects?: Array<RemoteProject>;
    remoteProjectsAreLoading?: boolean;
    threadWorkspaceRootHints?: Record<string, string>;
    onDiscoverThreadWorkspaceRootHint?: (
      threadId: string,
      workspaceRoot: string,
    ) => void;
  },
): Array<RepositoryTaskGroups> {
  const ownerByDir = fromPairs(
    (gitOrigins ?? []).flatMap(({ dir, originUrl }) => {
      const parsed = originUrl ? parseOwnerRepo(originUrl) : null;
      if (parsed) {
        return [[getComparableFsPath(dir), parsed]];
      }
      return [];
    }),
  );

  const envByLabel = groupBy(cloudEnvironments ?? [], (env) => env.label);
  const localGroupByPath = new Map<string, RepositoryTaskGroups>();
  for (const group of workspaceGroupsWithoutTasks) {
    if (group.projectKind === "local") {
      localGroupByPath.set(getComparableFsPath(group.path), group);
    }
  }

  tasks.forEach((task) => {
    if (task.kind === "local") {
      groupLocalTask(
        task,
        workspaceGroupsWithoutTasks,
        localGroupByPath,
        gitOrigins,
        options?.gitOriginsByHostId,
        codexHome,
        options?.primaryHostId,
        options,
      );
    } else if (task.kind === "remote") {
      groupRemoteTask(task, envByLabel, workspaceGroupsWithoutTasks);
    } else if (task.kind === "pending-worktree") {
      groupPendingWorktreeTask(
        task,
        ownerByDir,
        workspaceGroupsWithoutTasks,
        localGroupByPath,
      );
    }
  });

  return workspaceGroupsWithoutTasks;
}

function sameOwnerRepo(
  first: OwnerRepo | null | undefined,
  second: OwnerRepo | null | undefined,
): boolean {
  return Boolean(
    first &&
    second &&
    first.owner === second.owner &&
    first.repoName === second.repoName,
  );
}

export type GitOrigin =
  VSCodeFetchRequest["git-origins"]["response"]["origins"];

// Returns the deepest git origin that contains the given cwd.
export function getDeepestGitOrigin(
  cwd: string,
  gitOrigins: GitOrigin,
): GitOrigin[number] | null {
  const comparableCwd = getComparableFsPath(cwd).replace(/\/+$/, "");
  let best: GitOrigin[number] | null = null;
  let bestRootLength = -1;
  let bestHasRepoIdentity = false;
  for (const origin of gitOrigins) {
    const comparableRoot = getComparableFsPath(origin.root).replace(/\/+$/, "");
    if (
      !(
        comparableCwd === comparableRoot ||
        comparableCwd.startsWith(`${comparableRoot}/`)
      )
    ) {
      continue;
    }
    const hasRepoIdentity =
      origin.originUrl != null || origin.commonDir != null;
    if (best && hasRepoIdentity !== bestHasRepoIdentity) {
      if (!hasRepoIdentity) {
        continue;
      }
    } else if (comparableRoot.length <= bestRootLength) {
      continue;
    }
    best = origin;
    bestRootLength = comparableRoot.length;
    bestHasRepoIdentity = hasRepoIdentity;
  }
  return best;
}

function getRepoRelativeSegmentsWithOrigin(
  cwd: string,
  gitOrigins: GitOrigin | undefined,
): Array<string> {
  const origin = getDeepestGitOrigin(cwd, gitOrigins ?? []);
  if (!origin?.root) {
    return [];
  }
  const cwdSegments = pathSegments(getComparableFsPath(cwd));
  const originRootSegments = pathSegments(getComparableFsPath(origin.root));
  return cwdSegments.slice(originRootSegments.length);
}

/**
 * Split a path (from any platform) into its segments.
 */
export function pathSegments(cwd: string): Array<string> {
  return cwd.split(/[/\\]+/).filter(Boolean);
}

export function getWorkspaceRootDisplayParts({
  workspaceRoot,
  gitRoot,
}: {
  workspaceRoot: string | null;
  gitRoot: string | null;
}): {
  rootFolder: string;
  repoRootFolder: string;
} {
  const repoRootFolder = gitRoot
    ? (pathSegments(gitRoot).at(-1) ?? gitRoot)
    : "";
  const rootFolder = workspaceRoot
    ? (pathSegments(workspaceRoot).at(-1) ?? workspaceRoot)
    : repoRootFolder;
  return { rootFolder, repoRootFolder };
}

function findGroupByPath(
  groupByPath: Map<string, RepositoryTaskGroups>,
  path: string,
): RepositoryTaskGroups | null {
  return groupByPath.get(getComparableFsPath(path)) ?? null;
}

function hasGroupPath(
  groupByPath: Map<string, RepositoryTaskGroups>,
  path: string,
): boolean {
  return groupByPath.has(getComparableFsPath(path));
}

const groupLocalTask = (
  task: LocalMergedTask,
  workspaceGroupsWithoutTasks: Array<RepositoryTaskGroups>,
  groupByPath: Map<string, RepositoryTaskGroups>,
  gitOrigins: GitOrigin | undefined,
  gitOriginsByHostId: Record<string, GitOrigin> | undefined,
  codexHome?: string,
  primaryHostId: string = DEFAULT_HOST_ID,
  options?: {
    enabledRemoteHostIds?: Set<string>;
    remoteProjects?: Array<RemoteProject>;
    remoteProjectsAreLoading?: boolean;
    threadWorkspaceRootHints?: Record<string, string>;
    onDiscoverThreadWorkspaceRootHint?: (
      threadId: string,
      workspaceRoot: string,
    ) => void;
  },
): void => {
  const cwd = task.conversation.cwd;
  const cwdSegments = cwd ? pathSegments(cwd) : [];
  if (!cwd || !cwdSegments.length) {
    logger.warning("No cwd found for local task", {
      safe: { conversationId: task.conversation.id },
      sensitive: {},
    });
    return;
  }

  let cloneCwd = cwd;
  const taskGitOrigins = getGitOriginsForHostId({
    gitOrigins,
    gitOriginsByHostId,
    hostId: task.conversation.hostId,
    primaryHostId,
  });
  const isRemoteHostConversation =
    task.conversation.hostId != null &&
    task.conversation.hostId !== DEFAULT_HOST_ID;
  if (
    isCodexWorktree(cwd, codexHome) ||
    (isRemoteHostConversation && isGitWorktree(cwd, taskGitOrigins))
  ) {
    const mappedClone = findMappedCloneForWorktree(
      cwd,
      task.conversation.id,
      workspaceGroupsWithoutTasks,
      groupByPath,
      taskGitOrigins,
      codexHome,
      options?.threadWorkspaceRootHints,
    );
    if (mappedClone) {
      cloneCwd = mappedClone;
    }
  }
  const remoteProject = findRemoteProjectForHostAndPath(
    options?.remoteProjects ?? [],
    task.conversation.hostId,
    cloneCwd,
  );
  if (remoteProject != null) {
    const remoteProjectGroup =
      workspaceGroupsWithoutTasks.find((group) => {
        return group.projectId === remoteProject.id;
      }) ?? null;

    if (remoteProjectGroup != null) {
      remoteProjectGroup.tasks.push(task);
      return;
    }
  }

  if (isRemoteHostConversation) {
    if (
      task.conversation.hostId != null &&
      options?.enabledRemoteHostIds &&
      !options.enabledRemoteHostIds.has(task.conversation.hostId)
    ) {
      return;
    }
    if (!options?.remoteProjectsAreLoading) {
      logger.warning("No remote project found for remote-host conversation", {
        safe: {
          conversationId: task.conversation.id,
          hostId: task.conversation.hostId,
        },
        sensitive: {
          cwd,
          cloneCwd,
        },
      });
    }
    return;
  }

  const group = findGroupByPath(groupByPath, cloneCwd);
  if (!group) {
    return;
  }

  group.tasks.push(task);
  if (cloneCwd !== cwd) {
    options?.onDiscoverThreadWorkspaceRootHint?.(
      task.conversation.id,
      group.path,
    );
  }
};

function getGitOriginDirsByHostId(
  tasks: Array<MergedTask>,
  primaryHostId: string,
  workspaceRootOptions: Array<string> | undefined,
  remoteProjects: Array<RemoteProject>,
): Array<{ hostId: string; dirs: Array<string> }> {
  const dirsByHostId = new Map<string, Array<string>>([
    [primaryHostId, [...(workspaceRootOptions ?? [])]],
  ]);

  for (const task of tasks) {
    if (task.kind === "local") {
      const hostId = task.conversation.hostId ?? primaryHostId;
      const cwd = task.conversation.cwd;
      if (!cwd) {
        continue;
      }
      dirsByHostId.set(hostId, [...(dirsByHostId.get(hostId) ?? []), cwd]);
      continue;
    }
    if (task.kind === "pending-worktree") {
      const hostId = task.pendingWorktree.hostId;
      const sourceWorkspaceRoot = task.pendingWorktree.sourceWorkspaceRoot;
      if (!sourceWorkspaceRoot) {
        continue;
      }
      dirsByHostId.set(hostId, [
        ...(dirsByHostId.get(hostId) ?? []),
        sourceWorkspaceRoot,
      ]);
    }
  }

  for (const project of remoteProjects) {
    dirsByHostId.set(project.hostId, [
      ...(dirsByHostId.get(project.hostId) ?? []),
      project.remotePath,
    ]);
  }

  return Array.from(dirsByHostId.entries())
    .map(([hostId, dirs]) => ({
      hostId,
      dirs: uniq(dirs).sort((first, second) => first.localeCompare(second)),
    }))
    .filter(({ hostId, dirs }) => hostId === primaryHostId || dirs.length > 0);
}

function getGitOriginsForHostId({
  gitOrigins,
  gitOriginsByHostId,
  hostId,
  primaryHostId,
}: {
  gitOrigins: GitOrigin | undefined;
  gitOriginsByHostId: Record<string, GitOrigin> | undefined;
  hostId: string | undefined;
  primaryHostId: string;
}): GitOrigin {
  if (hostId && gitOriginsByHostId?.[hostId]) {
    return gitOriginsByHostId[hostId];
  }
  if (hostId && gitOriginsByHostId && hostId !== primaryHostId) {
    return [];
  }
  return gitOrigins ?? [];
}

function isGitWorktree(
  cwd: string,
  gitOrigins: GitOrigin | undefined,
): boolean {
  const origin = getDeepestGitOrigin(cwd, gitOrigins ?? []);
  if (!origin?.commonDir) {
    return false;
  }

  const comparableCommonDir = getComparableFsPath(origin.commonDir).replace(
    /\/+$/,
    "",
  );
  const comparableRoot = getComparableFsPath(origin.root).replace(/\/+$/, "");
  return comparableCommonDir !== `${comparableRoot}/.git`;
}

/**
 * Attempts to map codex worktrees back to their original clones by matching git origins.
 * Prefers workspace roots that match the worktree's repo-relative path.
 */
function findMappedCloneForWorktree(
  cwd: string,
  conversationId: string,
  workspaceGroupsWithoutTasks: Array<RepositoryTaskGroups>,
  groupByPath: Map<string, RepositoryTaskGroups>,
  gitOrigins: GitOrigin | undefined,
  codexHome?: string,
  threadWorkspaceRootHints?: Record<string, string>,
): string | null {
  if (hasGroupPath(groupByPath, cwd)) {
    return null;
  }
  const hintedWorkspaceRoot = threadWorkspaceRootHints?.[conversationId];
  if (hintedWorkspaceRoot && hasGroupPath(groupByPath, hintedWorkspaceRoot)) {
    return hintedWorkspaceRoot;
  }
  if (!gitOrigins) {
    return null;
  }
  const worktreeOrigin = getDeepestGitOrigin(cwd, gitOrigins);
  const worktreeOriginUrl = worktreeOrigin?.originUrl ?? null;
  const worktreeCommonDir = worktreeOrigin?.commonDir ?? null;
  if (!worktreeOriginUrl && !worktreeCommonDir) {
    return null;
  }
  if (!worktreeOrigin) {
    return null;
  }
  const matchesRepoIdentity = (origin: GitOrigin[number] | null): boolean => {
    if (!origin) {
      return false;
    }
    if (worktreeOriginUrl) {
      return origin.originUrl === worktreeOriginUrl;
    }
    if (worktreeCommonDir) {
      return origin.commonDir === worktreeCommonDir;
    }
    return false;
  };

  const comparableCwd = getComparableFsPath(cwd);
  const relativePath = getRepoRelativeSegmentsWithOrigin(cwd, gitOrigins).join(
    "/",
  );
  const worktreeRootFolder =
    pathSegments(worktreeOrigin.root).at(-1)?.toLowerCase() ?? "";
  let bestMatch: string | null = null;
  let bestLength = -1;
  let bestFolderMatch = false;
  for (const group of workspaceGroupsWithoutTasks) {
    const root = group.path;
    if (!root) {
      continue;
    }
    const comparableRoot = getComparableFsPath(root);
    if (group.isCodexWorktree && comparableCwd !== comparableRoot) {
      continue;
    }
    const rootOrigin = getDeepestGitOrigin(root, gitOrigins);
    if (!rootOrigin || !matchesRepoIdentity(rootOrigin)) {
      continue;
    }
    const rootRelativePath = getRepoRelativeSegmentsWithOrigin(
      root,
      gitOrigins,
    ).join("/");
    if (rootRelativePath !== relativePath) {
      continue;
    }
    const candidateRootFolder = (
      group.repositoryData?.rootFolder ??
      pathSegments(rootOrigin.root).at(-1) ??
      ""
    ).toLowerCase();
    const folderMatch =
      worktreeRootFolder.length > 0 &&
      candidateRootFolder === worktreeRootFolder;
    if (folderMatch && !bestFolderMatch) {
      bestMatch = root;
      bestLength = root.length;
      bestFolderMatch = true;
      continue;
    }
    if (folderMatch === bestFolderMatch && root.length > bestLength) {
      bestMatch = root;
      bestLength = root.length;
    }
  }
  if (bestMatch) {
    return bestMatch;
  }

  const matchingClone = (gitOrigins ?? []).reduce<string | null>(
    (deepest, candidate) => {
      if (!matchesRepoIdentity(candidate)) {
        return deepest;
      }
      if (isCodexWorktree(candidate.root, codexHome)) {
        return deepest;
      }
      if (!deepest) {
        return candidate.root;
      }
      return candidate.root.length > deepest.length ? candidate.root : deepest;
    },
    null,
  );
  return matchingClone;
}

function groupPendingWorktreeTask(
  task: PendingWorktreeTask,
  ownerByDir: Record<string, OwnerRepo | null>,
  workspaceGroupsWithoutTasks: Array<RepositoryTaskGroups>,
  groupByPath: Map<string, RepositoryTaskGroups>,
): void {
  const taskPath =
    task.pendingWorktree.startConversationParamsInput?.workspaceRoots[0] ??
    task.pendingWorktree.startConversationParamsInput?.cwd ??
    task.pendingWorktree.sourceWorkspaceRoot;
  if (!taskPath) {
    logger.warning("No original clone cwd found for pending worktree task", {
      safe: { pendingWorktreeId: task.pendingWorktree.id },
      sensitive: {},
    });
    return;
  }
  const ownerRepo = ownerByDir[getComparableFsPath(taskPath)] ?? null;
  const group =
    task.pendingWorktree.hostId === DEFAULT_HOST_ID
      ? findGroupByPath(groupByPath, taskPath)
      : (workspaceGroupsWithoutTasks.find((candidateGroup) => {
          return (
            candidateGroup.projectKind === "remote" &&
            candidateGroup.hostId === task.pendingWorktree.hostId &&
            getComparableFsPath(candidateGroup.path) ===
              getComparableFsPath(taskPath)
          );
        }) ?? null);
  if (!group) {
    return;
  }
  if (
    ownerRepo &&
    group.repositoryData?.ownerRepo != null &&
    !sameOwnerRepo(group.repositoryData.ownerRepo, ownerRepo)
  ) {
    return;
  }
  group.tasks.push(task);
}

function groupRemoteTask(
  task: RemoteMergedTask,
  envByLabel: Record<string, Array<CodeEnvironment>>,
  workspaceGroupsWithoutTasks: Array<RepositoryTaskGroups>,
): void {
  if (!Object.keys(envByLabel).length) {
    // Environments have not loaded yet so we can't group remote tasks yet.
    // Just return early to avoid trying to group it and failing below.
    return;
  }
  const ownerRepo = getOwnerRepoForRemote(task, envByLabel);
  // For now, all cloud tasks run at root of repo.
  const repoPath = "";
  // Should always have an owner repo for a cloud task, impossible to not have one.
  if (!ownerRepo) {
    logger.warning("No owner repo found for remote task", {
      safe: { taskId: task.task.id },
      sensitive: {},
    });
    return;
  }
  const normalizedRepoName = ownerRepo.repoName.toLowerCase();
  // Look for exact match on repo name and path so that cloud tasks can have a consistent owner
  const preferredGroup =
    workspaceGroupsWithoutTasks.find(
      (g) =>
        sameOwnerRepo(g.repositoryData?.ownerRepo, ownerRepo) &&
        g.repositoryData?.repoPath === repoPath &&
        g.repositoryData?.rootFolder?.toLowerCase() === normalizedRepoName,
    ) ?? null;

  const group =
    preferredGroup ??
    workspaceGroupsWithoutTasks.find((g) =>
      sameOwnerRepo(g.repositoryData?.ownerRepo, ownerRepo),
    ) ??
    null;
  if (!group) {
    return;
  }

  // Push onto main list
  group.tasks.push(task);
}

function getOwnerRepoForRemote(
  task: RemoteMergedTask,
  envByLabel: Record<string, Array<CodeEnvironment>>,
): OwnerRepo | null {
  const envLabel = task.task.task_status_display?.environment_label;
  if (!envLabel) {
    return null;
  }
  const environment = envByLabel[envLabel]?.[0];
  if (!environment) {
    return null;
  }
  const repoId = environment.repos?.[0];
  const cloneUrl = repoId ? environment.repo_map?.[repoId]?.clone_url : null;
  if (cloneUrl) {
    return parseOwnerRepo(cloneUrl) ?? null;
  }
  return null;
}
