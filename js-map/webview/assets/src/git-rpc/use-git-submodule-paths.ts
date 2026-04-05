import type { UseQueryResult } from "@tanstack/react-query";
import type { GitCwd, GitRoot, HostConfig } from "protocol";

import { QUERY_STALE_TIME } from "@/utils/query-stale-times";

import { useGitQuery, type UseFetchFromGitOptions } from "./git-api";

export function useGitSubmodulePaths(
  cwd: GitCwd | string | null | undefined,
  hostConfig: HostConfig,
  options?: UseFetchFromGitOptions<"submodule-paths", Array<string>>,
): UseQueryResult<Array<string>> {
  const queryOptions: UseFetchFromGitOptions<
    "submodule-paths",
    Array<string>
  > = {
    staleTime: QUERY_STALE_TIME.ONE_MINUTE,
    select: (data): Array<string> => data.paths,
    ...options,
  };

  return useGitQuery(
    cwd,
    hostConfig,
    "submodule-paths",
    ({ root }): { root: GitRoot } => ({ root }),
    queryOptions,
  );
}
