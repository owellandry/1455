import type { UseQueryResult } from "@tanstack/react-query";
import {
  createGitCwd,
  type GitBranchChangesResult,
  type GitCwd,
  type HostConfig,
} from "protocol";

import { useGitQuery, type UseFetchFromGitOptions } from "./git-api";

export function useGitBranchChanges(
  cwd: GitCwd | string | null | undefined,
  hostConfig: HostConfig,
  options?: UseFetchFromGitOptions<"branch-changes", GitBranchChangesResult>,
): UseQueryResult<GitBranchChangesResult> {
  return useGitQuery(
    cwd,
    hostConfig,
    "branch-changes",
    { cwd: createGitCwd(String(cwd)) },
    options,
  );
}
