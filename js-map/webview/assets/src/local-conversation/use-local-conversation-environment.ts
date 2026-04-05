import { useQueryClient } from "@tanstack/react-query";
import type {
  LocalEnvironmentResultWithPath,
  LocalEnvironmentWithPath,
  HostConfig,
} from "protocol";
import {
  createGitCwd,
  LOCAL_ENVIRONMENT_CONFIG_KEY,
  LOCAL_ENVIRONMENT_CONFIG_NONE,
} from "protocol";

import { gitQueryKey, useGitMutation } from "@/git-rpc/git-api";
import { getHostKey } from "@/git-rpc/host-config-utils";
import { useGitConfigValue } from "@/git-rpc/use-git-config-value";
import { useGitStableMetadata } from "@/git-rpc/use-git-stable-metadata";
import { useWindowType } from "@/hooks/use-window-type";
import { useResolvedLocalEnvironmentSelection } from "@/local-conversation/local-environment-selection";
import { normalizePath } from "@/utils/path";
import { useFetchFromVSCode } from "@/vscode-api";

import { useIsCodexWorktree } from "./use-is-codex-worktree";

export type LocalConversationEnvironmentState = {
  workspaceRoot: string | null;
  codexWorktree: boolean;
  environmentLabel: string | null;
  environment: LocalEnvironmentWithPath | null;
  resolvedEnvironmentConfigPath: string | null;
  localEnvironments: Array<LocalEnvironmentResultWithPath>;
  localEnvironmentsLoading: boolean;
  localEnvironmentsError: boolean;
  defaultEnvironment: LocalEnvironmentResultWithPath | null;
  defaultEnvironmentNormalized: string | null;
  availableEnvironments: Array<LocalEnvironmentResultWithPath>;
  normalizedResolvedConfigPath: string | null;
  canChangeEnvironment: boolean;
  setEnvironmentSelection: (configPath: string | null) => void;
  hasSavedActions: boolean;
};

export function useLocalConversationEnvironment(
  workspaceRoot: string | null,
  hostConfig: HostConfig,
): LocalConversationEnvironmentState {
  const windowType = useWindowType();
  const isElectronWindow = windowType === "electron";
  const hostKey = getHostKey(hostConfig);
  const cwd = workspaceRoot ? createGitCwd(workspaceRoot) : null;
  const resolvedSelection = useResolvedLocalEnvironmentSelection({
    workspaceRoot,
    enabled: isElectronWindow,
  });
  const queryClient = useQueryClient();
  const codexWorktree = useIsCodexWorktree(cwd, hostConfig.id);
  const { data: repoStableMetadata } = useGitStableMetadata(
    workspaceRoot,
    hostConfig,
  );
  const localEnvironments = resolvedSelection.environments;
  const localEnvironmentsLoading = resolvedSelection.isLoading;
  const localEnvironmentsFetching = resolvedSelection.isFetching;
  const localEnvironmentsError = resolvedSelection.error != null;
  const setConfigValue = useGitMutation("set-config-value", hostConfig, {
    onSuccess: (_, variables) => {
      if (!repoStableMetadata?.root) {
        return;
      }
      queryClient.setQueryData(
        gitQueryKey({
          metadata: repoStableMetadata,
          method: "config-value",
          hostKey,
          params: {
            root: repoStableMetadata.root,
            key: LOCAL_ENVIRONMENT_CONFIG_KEY,
            scope: "worktree",
          },
        }),
        variables.value,
      );
    },
  });
  const { data: storedEnvironmentConfigPathRaw } = useGitConfigValue(
    codexWorktree ? cwd : null,
    hostConfig,
    LOCAL_ENVIRONMENT_CONFIG_KEY,
    "worktree",
  );
  const storedEnvironmentConfigPath =
    storedEnvironmentConfigPathRaw === LOCAL_ENVIRONMENT_CONFIG_NONE
      ? null
      : storedEnvironmentConfigPathRaw;
  const resolvedWorktreeConfigPath = storedEnvironmentConfigPath;
  const normalizedResolvedWorktreeConfigPath = resolvedWorktreeConfigPath
    ? normalizePath(resolvedWorktreeConfigPath)
    : null;
  const resolvedEnvironmentConfigPath = codexWorktree
    ? resolvedWorktreeConfigPath
    : resolvedSelection.resolvedConfigPath;
  const normalizedResolvedConfigPath = codexWorktree
    ? normalizedResolvedWorktreeConfigPath
    : (resolvedSelection.normalizedResolvedConfigPath ?? null);
  const { data: environmentResult } = useFetchFromVSCode("local-environment", {
    params: {
      configPath: resolvedEnvironmentConfigPath ?? "",
    },
    select: (data) =>
      data.environment.type === "success" ? data.environment : null,
    queryConfig: {
      enabled: isElectronWindow && resolvedEnvironmentConfigPath != null,
    },
  });
  const environment = environmentResult ?? null;
  const hasSavedActions =
    (environment?.environment.actions ?? []).length > 0 ||
    localEnvironments.some((environmentResultItem) => {
      if (environmentResultItem.type !== "success") {
        return false;
      }
      return (environmentResultItem.environment.actions ?? []).length > 0;
    });
  const canChangeEnvironment =
    resolvedSelection.workspaceKey != null &&
    (!codexWorktree || repoStableMetadata?.root != null);
  const setEnvironmentSelection = (configPath: string | null): void => {
    if (codexWorktree) {
      if (!repoStableMetadata?.root) {
        return;
      }
      const valueToStore = configPath ?? LOCAL_ENVIRONMENT_CONFIG_NONE;
      setConfigValue.mutate({
        root: repoStableMetadata.root,
        key: LOCAL_ENVIRONMENT_CONFIG_KEY,
        value: valueToStore,
        scope: "worktree",
      });
      return;
    }
    resolvedSelection.updateSelection(configPath);
  };
  const environmentLabel =
    codexWorktree && resolvedEnvironmentConfigPath != null
      ? (environment?.environment.name ??
        getEnvironmentFileName(resolvedEnvironmentConfigPath))
      : null;

  return {
    workspaceRoot,
    codexWorktree,
    environmentLabel,
    environment,
    resolvedEnvironmentConfigPath: resolvedEnvironmentConfigPath ?? null,
    localEnvironments,
    localEnvironmentsLoading:
      localEnvironmentsLoading || localEnvironmentsFetching,
    localEnvironmentsError,
    defaultEnvironment: resolvedSelection.defaultEnvironment,
    defaultEnvironmentNormalized:
      resolvedSelection.defaultEnvironmentNormalized,
    availableEnvironments: resolvedSelection.availableEnvironments,
    normalizedResolvedConfigPath,
    canChangeEnvironment,
    setEnvironmentSelection,
    hasSavedActions,
  };
}

function getEnvironmentFileName(configPath: string): string {
  const normalized = normalizePath(configPath);
  const segments = normalized.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? normalized;
}
