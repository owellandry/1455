import type { LocalEnvironmentResultWithPath } from "protocol";
import { DEFAULT_ENVIRONMENT_FILE_NAME } from "protocol";

import { joinRootAndPath, normalizePath } from "./path";

export function getDefaultLocalEnvironmentResult(
  environments: Array<LocalEnvironmentResultWithPath>,
): LocalEnvironmentResultWithPath | null {
  const defaultEnvironment = environments.find(
    (environment): boolean =>
      getConfigFileName(environment.configPath) ===
        DEFAULT_ENVIRONMENT_FILE_NAME && environment.type === "success",
  );
  if (defaultEnvironment) {
    return defaultEnvironment;
  }
  const firstSuccessfulEnvironment = environments.find(
    (environment): boolean => environment.type === "success",
  );
  if (firstSuccessfulEnvironment) {
    return firstSuccessfulEnvironment;
  }
  return environments[0] ?? null;
}

export function getDefaultLocalEnvironmentConfigPath(
  environments: Array<LocalEnvironmentResultWithPath>,
): string | null {
  const defaultEnvironment = getDefaultLocalEnvironmentResult(environments);
  return defaultEnvironment?.configPath ?? null;
}

export function getNextLocalEnvironmentConfigPath(
  environments: Array<LocalEnvironmentResultWithPath>,
  workspaceRoot: string,
): string {
  const environmentsDir = joinRootAndPath(
    normalizePath(workspaceRoot),
    ".codex/environments",
  );
  const normalizedExisting = new Set(
    environments.map((env) => normalizePath(env.configPath)),
  );
  const defaultPath = joinRootAndPath(
    environmentsDir,
    DEFAULT_ENVIRONMENT_FILE_NAME,
  );
  if (!normalizedExisting.has(normalizePath(defaultPath))) {
    return defaultPath;
  }
  let index = 2;
  while (true) {
    const candidate = joinRootAndPath(
      environmentsDir,
      `environment-${index}.toml`,
    );
    if (!normalizedExisting.has(normalizePath(candidate))) {
      return candidate;
    }
    index += 1;
  }
}

function getConfigFileName(configPath: string): string {
  const normalized = normalizePath(configPath);
  const segments = normalized.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? normalized;
}
