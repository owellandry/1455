import { useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useScope } from "maitai";
import {
  createGitCwd,
  type GitDiff,
  type GitStagedAndUnstagedChangesResult,
  type GitTrackedUncommittedChangesResult,
  type GitUntrackedChangesResult,
  type HostConfig,
} from "protocol";

import {
  GIT_QUERY_KEY_PREFIX,
  gitQueryKey,
  useGitMutation,
  type UseMutateFromGitOptions,
  type UseMutateFromGitResult,
} from "@/git-rpc/git-api";
import { getHostKey } from "@/git-rpc/host-config-utils";
import type { GitStableMetadata } from "@/git-rpc/use-git-stable-metadata";
import { productEventLogger$ } from "@/product-event-signal";
import { AppScope } from "@/scopes/app-scope";

import { aIncludeUnstagedChanges } from "../atoms";
import { incrementBranchAheadCount } from "../shared/git-branch-ahead-count";

export function useCommitMutation({
  cwd,
  hostConfig,
  gitMetadata,
  onSuccess,
}: {
  cwd: string;
  hostConfig: HostConfig;
  gitMetadata: GitStableMetadata | null | undefined;
  onSuccess?: UseMutateFromGitOptions<"commit">["onSuccess"];
}): UseMutateFromGitResult<"commit"> {
  const queryClient = useQueryClient();
  const hostKey = getHostKey(hostConfig);
  const scope = useScope(AppScope);
  const includeUnstaged = useAtomValue(aIncludeUnstagedChanges(cwd));

  return useGitMutation("commit", hostConfig, {
    mutationKey: getCommitMutationKey(cwd),
    onSuccess: async (data, variables, onMutateResult, context) => {
      if (data.status !== "success") {
        return;
      }
      scope.get(productEventLogger$).log({
        eventName: "codex_git_commit_succeeded",
      });
      await updateDiffQueries(queryClient, {
        metadata: gitMetadata,
        cwd,
        includeUnstaged,
        hostKey,
      });
      incrementBranchAheadCount(queryClient, gitMetadata, hostKey);
      onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}

export function getCommitMutationKey(cwd: string): Array<unknown> {
  return [GIT_QUERY_KEY_PREFIX, "commit", cwd];
}

async function updateDiffQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  {
    metadata,
    cwd,
    includeUnstaged,
    hostKey,
  }: {
    metadata: GitStableMetadata | null | undefined;
    cwd: string;
    includeUnstaged: boolean;
    hostKey: string;
  },
): Promise<void> {
  if (!metadata) {
    return;
  }
  const gitCwd = createGitCwd(cwd);
  const emptyDiff: GitDiff = { type: "success", unifiedDiff: "" };
  const stagedKey = gitQueryKey({
    metadata,
    method: "staged-and-unstaged-changes",
    params: { cwd: createGitCwd(cwd) },
    hostKey,
  });
  const untrackedKey = gitQueryKey({
    metadata,
    method: "untracked-changes",
    params: { cwd: gitCwd },
    hostKey,
  });
  const trackedUncommittedKey = gitQueryKey({
    metadata,
    method: "tracked-uncommitted-changes",
    params: { cwd: gitCwd },
    hostKey,
  });
  await Promise.all([
    queryClient.cancelQueries({ queryKey: stagedKey, exact: true }),
    queryClient.cancelQueries({ queryKey: untrackedKey, exact: true }),
    queryClient.cancelQueries({ queryKey: trackedUncommittedKey, exact: true }),
  ]);
  const previousStagedAndUnstaged =
    queryClient.getQueryData<GitStagedAndUnstagedChangesResult>(stagedKey);
  if (includeUnstaged) {
    queryClient.setQueryData(stagedKey, {
      stagedChanges: emptyDiff,
      unstagedChanges: emptyDiff,
    });
    queryClient.setQueryData<GitUntrackedChangesResult>(untrackedKey, {
      untrackedChanges: emptyDiff,
    });
    queryClient.setQueryData<GitTrackedUncommittedChangesResult>(
      trackedUncommittedKey,
      {
        trackedChanges: emptyDiff,
      },
    );
    return;
  }

  queryClient.setQueryData(
    stagedKey,
    (previous: GitStagedAndUnstagedChangesResult | undefined) =>
      previous
        ? {
            stagedChanges: emptyDiff,
            unstagedChanges: previous.unstagedChanges,
          }
        : previous,
  );
  if (previousStagedAndUnstaged) {
    queryClient.setQueryData<GitTrackedUncommittedChangesResult>(
      trackedUncommittedKey,
      {
        trackedChanges: previousStagedAndUnstaged.unstagedChanges,
      },
    );
  }
}
