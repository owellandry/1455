import {
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import type {
  GitCwd,
  GitRoot,
  HostConfig,
  WorkerRequestResult,
} from "protocol";
import { createGitCwd } from "protocol";

import { useWindowType } from "@/hooks/use-window-type";
import { QUERY_STALE_TIME } from "@/utils/query-stale-times";
import { workerRpcClient } from "@/worker-rpc";

import { GIT_QUERY_KEY_PREFIX } from "./git-api";
import { getHostKey } from "./host-config-utils";

export type GitStableMetadata = WorkerRequestResult<"git", "stable-metadata">;

export function gitStableMetadataQueryOptions(
  cwd: GitCwd | GitRoot | string | null | undefined,
  hasGitRpc: boolean,
  hostKey: string,
  hostConfig: HostConfig,
): UseQueryOptions<GitStableMetadata> {
  const raw = cwd ? String(cwd) : "";

  return {
    queryKey: [GIT_QUERY_KEY_PREFIX, "metadata", hostKey, raw],
    staleTime: QUERY_STALE_TIME.INFINITE,
    gcTime: 30 * 60 * 1000,
    queryFn: ({ signal }): Promise<GitStableMetadata> => {
      if (!cwd) {
        return Promise.reject(new Error("Missing cwd"));
      }
      return workerRpcClient("git").request({
        method: "stable-metadata",
        params: {
          cwd: createGitCwd(String(cwd)),
          hostConfig,
        },
        signal,
      });
    },
    enabled: (): boolean => {
      if (!hasGitRpc || cwd == null) {
        return false;
      }
      return true;
    },
  };
}

export function useHasGitRpc(): boolean {
  const windowType = useWindowType();
  return windowType === "electron" || windowType === "extension";
}

export function useGitStableMetadata(
  cwd: GitCwd | GitRoot | string | null | undefined,
  hostConfig: HostConfig,
): UseQueryResult<GitStableMetadata> {
  const hasGitRpc = useHasGitRpc();
  const hostKey = getHostKey(hostConfig);
  return useQuery(
    gitStableMetadataQueryOptions(cwd, hasGitRpc, hostKey, hostConfig),
  );
}
