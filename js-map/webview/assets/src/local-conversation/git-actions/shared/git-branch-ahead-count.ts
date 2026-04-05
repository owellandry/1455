import type { QueryClient } from "@tanstack/react-query";
import type { WorkerRequestResult } from "protocol";

import { gitQueryKey } from "@/git-rpc/git-api";
import type { GitStableMetadata } from "@/git-rpc/use-git-stable-metadata";

function updateBranchAheadCount(
  queryClient: QueryClient,
  metadata: GitStableMetadata | null | undefined,
  hostKey: string,
  getNextCount: (current: number) => number,
): void {
  if (!metadata) {
    return;
  }
  const key = gitQueryKey({
    metadata,
    method: "branch-ahead-count",
    params: { root: metadata.root },
    hostKey,
  });
  queryClient.setQueryData(
    key,
    (
      aheadCount: WorkerRequestResult<"git", "branch-ahead-count"> | undefined,
    ): WorkerRequestResult<"git", "branch-ahead-count"> | undefined => {
      if (!aheadCount) {
        return aheadCount;
      }
      return {
        ...aheadCount,
        commitsAhead: getNextCount(aheadCount.commitsAhead),
      };
    },
  );
  void queryClient.invalidateQueries({ queryKey: key });
}

export function incrementBranchAheadCount(
  queryClient: QueryClient,
  metadata: GitStableMetadata | null | undefined,
  hostKey: string,
): void {
  updateBranchAheadCount(
    queryClient,
    metadata,
    hostKey,
    (current) => current + 1,
  );
}

export function resetBranchAheadCount(
  queryClient: QueryClient,
  metadata: GitStableMetadata | null | undefined,
  hostKey: string,
): void {
  updateBranchAheadCount(queryClient, metadata, hostKey, () => 0);
}
