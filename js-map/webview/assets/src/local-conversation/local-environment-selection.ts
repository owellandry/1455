import { useAtom } from "jotai";
import type { LocalEnvironmentResultWithPath } from "protocol";

import { getDefaultLocalEnvironmentResult } from "@/utils/local-environments";
import { normalizePath } from "@/utils/path";
import { persistedAtom } from "@/utils/persisted-atom";
import { useFetchFromVSCode } from "@/vscode-api";

export const aLocalEnvironmentSelectionsByWorkspace = persistedAtom<
  Record<string, string | null>
>("local-env-selections-by-workspace", {});

type SaveSelectionParams = {
  selectionsByWorkspace: Record<string, string | null>;
  setSelectionsByWorkspace: (next: Record<string, string | null>) => void;
  workspaceRoot: string | null;
  configPath: string | null;
};

type ResolvedSelectionParams = {
  workspaceRoot: string | null;
  enabled?: boolean;
};

export function getDefaultAndAvailableEnvironments(
  environments: Array<LocalEnvironmentResultWithPath>,
): {
  defaultEnvironment: LocalEnvironmentResultWithPath | null;
  defaultEnvironmentNormalized: string | null;
  availableEnvironments: Array<LocalEnvironmentResultWithPath>;
} {
  const defaultEnvironment = getDefaultLocalEnvironmentResult(environments);
  const defaultEnvironmentConfigPath = defaultEnvironment?.configPath ?? null;
  const defaultEnvironmentNormalized = defaultEnvironmentConfigPath
    ? normalizePath(defaultEnvironmentConfigPath)
    : null;
  const availableEnvironments = defaultEnvironmentNormalized
    ? environments.filter((environment) => {
        return (
          normalizePath(environment.configPath) !== defaultEnvironmentNormalized
        );
      })
    : environments;

  return {
    defaultEnvironment,
    defaultEnvironmentNormalized,
    availableEnvironments,
  };
}

export function getLocalEnvironmentWorkspaceKey(
  workspaceRoot: string | null,
): string | null {
  if (!workspaceRoot || workspaceRoot === "/") {
    return null;
  }
  return normalizePath(workspaceRoot);
}

export function setLocalEnvironmentSelectionForWorkspace({
  selectionsByWorkspace,
  setSelectionsByWorkspace,
  workspaceRoot,
  configPath,
}: SaveSelectionParams): void {
  const workspaceKey = getLocalEnvironmentWorkspaceKey(workspaceRoot);
  if (!workspaceKey) {
    return;
  }
  setSelectionsByWorkspace({
    ...selectionsByWorkspace,
    [workspaceKey]: configPath,
  });
}

export function useResolvedLocalEnvironmentSelection({
  workspaceRoot,
  enabled = true,
}: ResolvedSelectionParams): {
  workspaceKey: string | null;
  environments: Array<LocalEnvironmentResultWithPath>;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  defaultEnvironment: LocalEnvironmentResultWithPath | null;
  defaultEnvironmentNormalized: string | null;
  availableEnvironments: Array<LocalEnvironmentResultWithPath>;
  resolvedConfigPath: string | null;
  normalizedResolvedConfigPath: string | null;
  updateSelection: (configPath: string | null) => void;
} {
  const [selectionsByWorkspace, setSelectionsByWorkspace] = useAtom(
    aLocalEnvironmentSelectionsByWorkspace,
  );
  const workspaceKey = getLocalEnvironmentWorkspaceKey(workspaceRoot);
  const {
    data: localEnvironmentsData,
    isLoading,
    isFetching,
    error,
  } = useFetchFromVSCode("local-environments", {
    params: {
      workspaceRoot: workspaceRoot ?? "",
    },
    queryConfig: {
      enabled: workspaceKey != null && enabled,
    },
    select: (data) => data.environments,
  });
  const environments = localEnvironmentsData ?? [];
  const {
    defaultEnvironment,
    defaultEnvironmentNormalized,
    availableEnvironments,
  } = getDefaultAndAvailableEnvironments(environments);
  const defaultEnvironmentConfigPath = defaultEnvironment?.configPath ?? null;
  const hasWorkspaceSelection =
    workspaceKey != null &&
    Object.prototype.hasOwnProperty.call(selectionsByWorkspace, workspaceKey);
  let selectedConfigPath: string | null = null;
  if (workspaceKey && hasWorkspaceSelection) {
    selectedConfigPath = selectionsByWorkspace[workspaceKey] ?? null;
  }
  const canValidateSelection = !isLoading && !isFetching && error == null;
  const normalizedSelectedConfigPath = selectedConfigPath
    ? normalizePath(selectedConfigPath)
    : null;
  const hasSelectedEnvironment =
    canValidateSelection &&
    normalizedSelectedConfigPath != null &&
    environments.some((environment) => {
      return (
        normalizePath(environment.configPath) === normalizedSelectedConfigPath
      );
    });
  let resolvedConfigPath = hasWorkspaceSelection ? selectedConfigPath : null;
  if (
    canValidateSelection &&
    hasWorkspaceSelection &&
    selectedConfigPath != null &&
    !hasSelectedEnvironment
  ) {
    resolvedConfigPath = defaultEnvironmentConfigPath;
  }
  const normalizedResolvedConfigPath = resolvedConfigPath
    ? normalizePath(resolvedConfigPath)
    : null;
  const updateSelection = (configPath: string | null): void => {
    setLocalEnvironmentSelectionForWorkspace({
      selectionsByWorkspace,
      setSelectionsByWorkspace,
      workspaceRoot,
      configPath,
    });
  };

  return {
    workspaceKey,
    environments,
    isLoading,
    isFetching,
    error,
    defaultEnvironment,
    defaultEnvironmentNormalized,
    availableEnvironments,
    resolvedConfigPath,
    normalizedResolvedConfigPath,
    updateSelection,
  };
}
