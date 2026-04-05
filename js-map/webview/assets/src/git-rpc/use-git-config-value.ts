import type { UseQueryResult } from "@tanstack/react-query";
import type { GitCwd, GitRoot, HostConfig } from "protocol";

import { useGitQuery, type UseFetchFromGitOptions } from "./git-api";

export function useGitConfigValue(
  cwd: GitCwd | string | null | undefined,
  hostConfig: HostConfig,
  key: string,
  scope: "local" | "worktree",
  options?: UseFetchFromGitOptions<"config-value", string | null>,
): UseQueryResult<string | null> {
  return useGitQuery(
    cwd,
    hostConfig,
    "config-value",
    ({ root }): { root: GitRoot; key: string; scope: "local" | "worktree" } => {
      return {
        root,
        key,
        scope,
      };
    },
    {
      select: (data): string | null => data.value,
      ...options,
    },
  );
}
