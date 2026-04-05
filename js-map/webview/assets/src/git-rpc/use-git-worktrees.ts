import type { UseQueryResult } from "@tanstack/react-query";
import {
  createGitCwd,
  type GitCwd,
  type HostConfig,
  type WorkerRequestResult,
} from "protocol";

import { QUERY_STALE_TIME } from "@/utils/query-stale-times";

import { useGitQuery, type UseFetchFromGitOptions } from "./git-api";

export function useGitWorktrees(
  cwd: GitCwd | string | null | undefined,
  hostConfig: HostConfig,
  options: UseFetchFromGitOptions<"list-worktrees"> = {},
): UseQueryResult<WorkerRequestResult<"git", "list-worktrees">> {
  return useGitQuery(
    cwd,
    hostConfig,
    "list-worktrees",
    { cwd: createGitCwd(String(cwd)) },
    {
      staleTime: QUERY_STALE_TIME.FIVE_SECONDS,
      ...options,
    },
  );
}
