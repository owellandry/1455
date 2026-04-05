import type { UseQueryResult } from "@tanstack/react-query";
import type { GitCwd, GitRoot, HostConfig } from "protocol";

import { useGitQuery, type UseFetchFromGitOptions } from "./git-api";

type UseGitRecentBranchesOptions = UseFetchFromGitOptions<
  "recent-branches",
  Array<string>
> & { limit?: number };

export function useGitRecentBranches(
  cwd: GitCwd | string | null | undefined,
  hostConfig: HostConfig,
  options?: UseGitRecentBranchesOptions,
): UseQueryResult<Array<string>> {
  const { limit = 100, ...queryOptions } = options ?? {};

  return useGitQuery<"recent-branches", Array<string>>(
    cwd,
    hostConfig,
    "recent-branches",
    ({ root }): { root: GitRoot; limit?: number } => ({
      root,
      limit,
    }),
    {
      select: (data): Array<string> => data.branches,
      ...queryOptions,
    },
  );
}
