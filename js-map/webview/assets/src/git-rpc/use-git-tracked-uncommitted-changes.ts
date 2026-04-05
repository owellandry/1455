import type { UseQueryResult } from "@tanstack/react-query";
import {
  createGitCwd,
  type GitCwd,
  type HostConfig,
  type GitTrackedUncommittedChangesResult,
} from "protocol";

import { QUERY_STALE_TIME } from "@/utils/query-stale-times";

import { useGitQuery, type UseFetchFromGitOptions } from "./git-api";

export function useGitTrackedUncommittedChanges(
  cwd: GitCwd | string | null | undefined,
  hostConfig: HostConfig,
  {
    staleTime,
    ...options
  }: UseFetchFromGitOptions<
    "tracked-uncommitted-changes",
    GitTrackedUncommittedChangesResult
  > = {},
): UseQueryResult<GitTrackedUncommittedChangesResult> {
  return useGitQuery(
    cwd,
    hostConfig,
    "tracked-uncommitted-changes",
    { cwd: createGitCwd(String(cwd)) },
    {
      staleTime: staleTime ?? QUERY_STALE_TIME.FIVE_SECONDS,
      ...options,
    },
  );
}
