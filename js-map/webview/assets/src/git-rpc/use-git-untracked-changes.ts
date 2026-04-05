import type { UseQueryResult } from "@tanstack/react-query";
import {
  createGitCwd,
  type GitCwd,
  type HostConfig,
  type GitUntrackedChangesResult,
} from "protocol";

import { QUERY_STALE_TIME } from "@/utils/query-stale-times";

import { useGitQuery, type UseFetchFromGitOptions } from "./git-api";

export function useGitUntrackedChanges(
  cwd: GitCwd | string | null | undefined,
  hostConfig: HostConfig,
  {
    staleTime,
    ...options
  }: UseFetchFromGitOptions<
    "untracked-changes",
    GitUntrackedChangesResult
  > = {},
): UseQueryResult<GitUntrackedChangesResult> {
  return useGitQuery(
    cwd,
    hostConfig,
    "untracked-changes",
    { cwd: createGitCwd(String(cwd)) },
    {
      staleTime: staleTime ?? QUERY_STALE_TIME.FIVE_SECONDS,
      ...options,
    },
  );
}
