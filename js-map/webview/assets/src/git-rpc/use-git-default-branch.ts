import type { UseQueryResult } from "@tanstack/react-query";
import type { GitCwd, GitRoot, HostConfig } from "protocol";

import { useGitQuery, type UseFetchFromGitOptions } from "./git-api";

export function useGitDefaultBranch(
  cwd: GitCwd | string | null | undefined,
  hostConfig: HostConfig,
  options?: UseFetchFromGitOptions<"default-branch", string | null>,
): UseQueryResult<string | null> {
  return useGitQuery<"default-branch", string | null>(
    cwd,
    hostConfig,
    "default-branch",
    ({ root }): { root: GitRoot } => ({ root }),
    {
      select: (data): string | null => data.branch,
      ...options,
    },
  );
}
