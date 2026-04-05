import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { HostConfig, WorkerRequestResult } from "protocol";

import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { workerRpcClient } from "@/worker-rpc";
import { codexWorktreesQueryKey } from "@/worktrees/worktree-query-keys";

import { getHostKey } from "./host-config-utils";
import { useHasGitRpc } from "./use-git-stable-metadata";

export type CodexWorktreeResponse = WorkerRequestResult<
  "git",
  "codex-worktrees"
>;

export function useCodexWorktrees(
  hostConfig: HostConfig,
): UseQueryResult<CodexWorktreeResponse> {
  const hasGitRpc = useHasGitRpc();
  const hostKey = getHostKey(hostConfig);
  return useQuery({
    queryKey: codexWorktreesQueryKey(hostKey),
    queryFn: ({ signal }): Promise<CodexWorktreeResponse> => {
      return workerRpcClient("git").request({
        method: "codex-worktrees",
        params: { hostConfig },
        signal,
      });
    },
    staleTime: QUERY_STALE_TIME.INFINITE,
    gcTime: 30 * 60 * 1000,
    enabled: hasGitRpc,
  });
}
