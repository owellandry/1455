import type { GitCwd, HostConfig } from "protocol";

import { mergeUnifiedDiffs } from "@/diff/merge-unified-diffs";
import { parseDiff, type CodexDiffFile } from "@/diff/parse-diff";

import { useGitTrackedUncommittedChanges } from "./use-git-tracked-uncommitted-changes";
import { useGitUntrackedChanges } from "./use-git-untracked-changes";

export function useGitMergedUncommittedChanges(
  cwd: GitCwd | string | null | undefined,
  hostConfig: HostConfig,
  {
    enabled = true,
    includeFiles = true,
  }: { enabled?: boolean; includeFiles?: boolean } = {},
): {
  uncommittedDiff: string | null;
  uncommittedFiles: Array<CodexDiffFile> | null;
  isFetchingTracked: boolean;
  isFetchingUntracked: boolean;
} {
  const { data: trackedChanges, isFetching: isFetchingTrackedChanges } =
    useGitTrackedUncommittedChanges(cwd, hostConfig, { enabled });
  const { data: untrackedChanges, isFetching: isFetchingUntrackedChanges } =
    useGitUntrackedChanges(cwd, hostConfig, { enabled });

  const trackedUnified =
    trackedChanges?.trackedChanges.type === "success"
      ? trackedChanges.trackedChanges.unifiedDiff
      : null;
  const trackedReady = trackedChanges?.trackedChanges.type === "success";
  const untrackedUnified =
    untrackedChanges?.untrackedChanges.type === "success"
      ? untrackedChanges.untrackedChanges.unifiedDiff
      : null;
  const untrackedReady = untrackedChanges?.untrackedChanges.type === "success";

  const mergedDiff = mergeUnifiedDiffs([trackedUnified, untrackedUnified]);
  const uncommittedDiff =
    mergedDiff ?? (trackedReady && untrackedReady ? "" : null);

  const uncommittedFiles =
    includeFiles && uncommittedDiff != null
      ? [...parseDiff(uncommittedDiff)].sort((first, second) =>
          first.metadata.name.localeCompare(second.metadata.name),
        )
      : null;

  return {
    uncommittedDiff,
    uncommittedFiles,
    isFetchingTracked: isFetchingTrackedChanges,
    isFetchingUntracked: isFetchingUntrackedChanges,
  };
}
