import type { UseQueryResult } from "@tanstack/react-query";
import {
  createGitCwd,
  type GitCwd,
  type GitStatusSummary,
  type HostConfig,
} from "protocol";

import { QUERY_STALE_TIME } from "@/utils/query-stale-times";

import { useGitQuery, type UseFetchFromGitOptions } from "./git-api";

export function useGitStatusSummary(
  cwd: GitCwd | string | null | undefined,
  hostConfig: HostConfig,
  {
    staleTime,
    ...options
  }: UseFetchFromGitOptions<"status-summary", GitStatusSummary> = {},
): UseQueryResult<GitStatusSummary> {
  return useGitQuery<"status-summary", GitStatusSummary>(
    cwd,
    hostConfig,
    "status-summary",
    { cwd: createGitCwd(String(cwd)) },
    {
      staleTime: staleTime ?? QUERY_STALE_TIME.FIVE_SECONDS,
      ...options,
    },
  );
}
