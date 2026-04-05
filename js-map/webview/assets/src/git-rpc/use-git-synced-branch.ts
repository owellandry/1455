import type { UseQueryResult } from "@tanstack/react-query";
import {
  isCodexWorktree,
  type GitCwd,
  type GitSyncedBranchInfo,
  type HostConfig,
} from "protocol";

import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { useFetchFromVSCode } from "@/vscode-api";

import { useGitQuery } from "./git-api";

export function useGitSyncedBranch(
  cwd: GitCwd | string | null | undefined,
  hostConfig: HostConfig,
): UseQueryResult<GitSyncedBranchInfo> {
  const { data: codexHome } = useFetchFromVSCode("codex-home", {
    select: (data): string | undefined => data?.codexHome,
  });
  return useGitQuery(
    cwd,
    hostConfig,
    "synced-branch",
    ({ root }) => ({ cwd: root }),
    {
      staleTime: QUERY_STALE_TIME.FIVE_SECONDS,
      enabled: isCodexWorktree(cwd ?? null, codexHome),
    },
  );
}
