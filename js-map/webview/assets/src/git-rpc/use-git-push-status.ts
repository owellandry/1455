import type { GitCwd, GitPushStatus, HostConfig } from "protocol";

import { useGitQuery } from "@/git-rpc/git-api";
import { useGitDefaultBranch } from "@/git-rpc/use-git-default-branch";
import {
  useGitStableMetadata,
  type GitStableMetadata,
} from "@/git-rpc/use-git-stable-metadata";
import { normalizeFsPath } from "@/utils/path";

type GitPushStatusResult = {
  data: GitPushStatus | undefined;
  isSuccess: boolean;
  refetch: () => Promise<Array<unknown>>;
};

function resolveIsMainWorktree(metadata: GitStableMetadata): boolean {
  const root = normalizeFsPath(metadata.root).replace(/\/+$/, "");
  const commonDir = normalizeFsPath(metadata.commonDir).replace(/\/+$/, "");
  if (commonDir === root) {
    return true;
  }
  return commonDir === `${root}/.git`;
}

export function useGitPushStatus(
  cwd: GitCwd | string | null | undefined,
  hostConfig: HostConfig,
): GitPushStatusResult {
  const branchQueryOptions = {
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  };
  const metadataQuery = useGitStableMetadata(cwd, hostConfig);
  const upstreamBranchQuery = useGitQuery(
    cwd,
    hostConfig,
    "upstream-branch",
    ({ root }) => ({
      root,
    }),
    branchQueryOptions,
  );
  const branchAheadCountQuery = useGitQuery(
    cwd,
    hostConfig,
    "branch-ahead-count",
    ({ root }) => ({ root }),
    branchQueryOptions,
  );
  const defaultBranchQuery = useGitDefaultBranch(
    cwd,
    hostConfig,
    branchQueryOptions,
  );

  const isSuccess =
    metadataQuery.isSuccess &&
    upstreamBranchQuery.isSuccess &&
    branchAheadCountQuery.isSuccess &&
    defaultBranchQuery.isSuccess;

  let data: GitPushStatus | undefined;
  if (isSuccess && metadataQuery.data && upstreamBranchQuery.data) {
    data = {
      gitRoot: metadataQuery.data.root,
      branch: upstreamBranchQuery.data.branch ?? null,
      defaultBranch: defaultBranchQuery.data ?? null,
      commitsAhead: branchAheadCountQuery.data.commitsAhead,
      upstreamRef: upstreamBranchQuery.data.upstream?.branch ?? null,
      isMainWorktree: resolveIsMainWorktree(metadataQuery.data),
    };
  }

  return {
    data,
    isSuccess,
    refetch: async () =>
      Promise.all([
        upstreamBranchQuery.refetch(),
        branchAheadCountQuery.refetch(),
      ]),
  };
}
