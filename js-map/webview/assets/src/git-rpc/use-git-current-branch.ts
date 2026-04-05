import type { UseQueryResult } from "@tanstack/react-query";
import type { GitCwd, GitRoot, HostConfig } from "protocol";

import { useGitQuery, type UseFetchFromGitOptions } from "./git-api";

export function useGitCurrentBranch(
  cwd: GitCwd | string | null | undefined,
  hostConfig: HostConfig,
  options?: UseFetchFromGitOptions<"current-branch", string | null>,
): UseQueryResult<string | null> {
  const queryOptions: UseFetchFromGitOptions<"current-branch", string | null> =
    {
      select: (data): string | null => data.branch,
      ...options,
    };

  return useGitQuery(
    cwd,
    hostConfig,
    "current-branch",
    ({ root }): { root: GitRoot } => ({ root }),
    queryOptions,
  );
}
