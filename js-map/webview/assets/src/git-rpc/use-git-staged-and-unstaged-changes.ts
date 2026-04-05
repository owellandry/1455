import type { UseQueryResult } from "@tanstack/react-query";
import {
  createGitCwd,
  type GitCwd,
  type HostConfig,
  type GitStagedAndUnstagedChangesResult,
} from "protocol";

import { QUERY_STALE_TIME } from "@/utils/query-stale-times";

import { useGitQuery, type UseFetchFromGitOptions } from "./git-api";

export function useGitStagedAndUnstagedChanges(
  cwd: GitCwd | string | null | undefined,
  hostConfig: HostConfig,
  {
    staleTime,
    ...options
  }: UseFetchFromGitOptions<
    "staged-and-unstaged-changes",
    GitStagedAndUnstagedChangesResult
  > = {},
): UseQueryResult<GitStagedAndUnstagedChangesResult> {
  return useGitQuery(
    cwd,
    hostConfig,
    "staged-and-unstaged-changes",
    { cwd: createGitCwd(String(cwd)) },
    {
      staleTime: staleTime ?? QUERY_STALE_TIME.FIVE_SECONDS,
      refetchOnWindowFocus: true,
      ...options,
    },
  );
}
