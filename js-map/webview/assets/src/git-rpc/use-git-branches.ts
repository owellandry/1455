import type { UseQueryResult } from "@tanstack/react-query";
import type { GitCwd, GitRoot, HostConfig } from "protocol";

import { QUERY_STALE_TIME } from "@/utils/query-stale-times";

import { useGitQuery, type UseFetchFromGitOptions } from "./git-api";

type UseGitBranchesOptions = UseFetchFromGitOptions<
  "recent-branches",
  Array<string>
>;

export function useGitBranches(
  cwd: GitCwd | string | null | undefined,
  hostConfig: HostConfig,
  options?: UseGitBranchesOptions,
): UseQueryResult<Array<string>> {
  return useGitQuery<"recent-branches", Array<string>>(
    cwd,
    hostConfig,
    "recent-branches",
    ({ root }): { root: GitRoot; limit: number } => ({
      root,
      limit: 100,
    }),
    {
      select: (data): Array<string> => data.branches,
      staleTime: QUERY_STALE_TIME.FIVE_SECONDS,
      ...options,
    },
  );
}
