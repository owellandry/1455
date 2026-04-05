import type { GitCwd, HostConfig } from "protocol";
import { useEffect } from "react";

import { workerRpcClient } from "@/worker-rpc";

import { useGitStableMetadata, useHasGitRpc } from "./use-git-stable-metadata";

export function useGitHeadChangeRefetch(
  cwd: GitCwd | string | null | undefined,
  hostConfig: HostConfig,
  refetch: (() => Promise<unknown>) | undefined,
): void {
  const hasGitRpc = useHasGitRpc();
  const { data: gitMetadata } = useGitStableMetadata(cwd, hostConfig);

  useEffect(() => {
    if (!hasGitRpc) {
      return undefined;
    }
    if (!gitMetadata) {
      return undefined;
    }
    if (!refetch) {
      return undefined;
    }
    return workerRpcClient("git").subscribe("git-repo-changed", (event) => {
      if (event.changeType !== "head") {
        return;
      }
      if (event.commonDir !== gitMetadata.commonDir) {
        return;
      }
      if (event.root !== gitMetadata.root) {
        return;
      }
      void refetch();
    });
  }, [gitMetadata, hasGitRpc, refetch]);
}
