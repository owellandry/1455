import { createGitCwd, type HostConfig } from "protocol";

import { mergeUnifiedDiffs } from "@/diff/merge-unified-diffs";
import { parseDiff, type CodexDiffFile } from "@/diff/parse-diff";
import { workerRpcClient } from "@/worker-rpc";

export type OptimisticMaps = {
  version: number;
  staged: {
    trimmed: Map<string, CodexDiffFile>;
    full: Map<string, CodexDiffFile>;
  };
  unstaged: {
    trimmed: Map<string, CodexDiffFile>;
    full: Map<string, CodexDiffFile>;
  };
  touchedPaths: Set<string>;
};

export const emptyOptimisticMaps = (): OptimisticMaps => ({
  version: 0,
  staged: {
    trimmed: new Map<string, CodexDiffFile>(),
    full: new Map<string, CodexDiffFile>(),
  },
  unstaged: {
    trimmed: new Map<string, CodexDiffFile>(),
    full: new Map<string, CodexDiffFile>(),
  },
  touchedPaths: new Set<string>(),
});

export async function fetchRefreshPathsFastDiffs({
  cwd,
  hasGitRpc,
  hostConfig,
  paths,
  version,
}: {
  cwd: string;
  hasGitRpc: boolean;
  hostConfig: HostConfig;
  paths: Array<string>;
  version: number;
}): Promise<{
  version: number;
  paths: Array<string>;
  stagedUnified: string;
  unstagedUnified: string;
}> {
  if (!hasGitRpc) {
    throw new Error("Git RPC is unavailable in this environment");
  }

  const [trackedResult, untrackedResult] = await Promise.all([
    workerRpcClient("git").request({
      method: "staged-and-unstaged-changes",
      params: { cwd: createGitCwd(cwd), paths, hostConfig },
    }),
    workerRpcClient("git").request({
      method: "untracked-changes",
      params: { cwd: createGitCwd(cwd), paths, hostConfig },
    }),
  ]);
  if (
    trackedResult.stagedChanges.type !== "success" ||
    trackedResult.unstagedChanges.type !== "success"
  ) {
    throw new Error("Failed to fetch staged and unstaged changes");
  }

  const stagedUnified = trackedResult.stagedChanges.unifiedDiff;
  const untrackedUnified =
    untrackedResult.untrackedChanges.type === "success"
      ? untrackedResult.untrackedChanges.unifiedDiff
      : "";
  const unstagedUnified =
    mergeUnifiedDiffs([
      trackedResult.unstagedChanges.unifiedDiff,
      untrackedUnified,
    ]) ?? "";

  return { version, paths, stagedUnified, unstagedUnified };
}

export function parseRefreshPathsFastDiffs({
  stagedUnified,
  unstagedUnified,
}: {
  stagedUnified: string;
  unstagedUnified: string;
}): {
  trimmedStaged: Array<CodexDiffFile>;
  trimmedUnstaged: Array<CodexDiffFile>;
  fullStaged: Array<CodexDiffFile>;
  fullUnstaged: Array<CodexDiffFile>;
} {
  const parseUnified = (
    unified: string,
  ): { trimmed: Array<CodexDiffFile>; full: Array<CodexDiffFile> } => {
    if (!unified) {
      return { trimmed: [], full: [] };
    }
    const parsed = parseDiff(unified);
    return { trimmed: parsed, full: parsed };
  };

  const { trimmed: trimmedStaged, full: fullStaged } =
    parseUnified(stagedUnified);
  const { trimmed: trimmedUnstaged, full: fullUnstaged } =
    parseUnified(unstagedUnified);

  return {
    trimmedStaged,
    trimmedUnstaged,
    fullStaged,
    fullUnstaged,
  };
}

export function getOptimisticPaths(
  optimisticDiffs: OptimisticMaps,
): Set<string> {
  return new Set<string>([
    ...optimisticDiffs.staged.trimmed.keys(),
    ...optimisticDiffs.staged.full.keys(),
    ...optimisticDiffs.unstaged.trimmed.keys(),
    ...optimisticDiffs.unstaged.full.keys(),
    ...optimisticDiffs.touchedPaths,
  ]);
}

/**
 * For each set of diffs, ensure that it has the latest entries for the given paths.
 * Protect against multiple optimistic diffs being applied in quick succession and becoming out of date
 */
export function applyOptimisticDiffs(
  previous: OptimisticMaps,
  {
    paths,
    trimmedStaged,
    trimmedUnstaged,
    fullStaged,
    fullUnstaged,
  }: {
    paths: Array<string>;
    trimmedStaged: Array<CodexDiffFile>;
    trimmedUnstaged: Array<CodexDiffFile>;
    fullStaged: Array<CodexDiffFile>;
    fullUnstaged: Array<CodexDiffFile>;
  },
): Omit<OptimisticMaps, "version"> {
  const keysToDelete = new Set<string>([
    ...paths,
    ...trimmedStaged.map((file) => file.metadata.name),
    ...trimmedUnstaged.map((file) => file.metadata.name),
    ...fullStaged.map((file) => file.metadata.name),
    ...fullUnstaged.map((file) => file.metadata.name),
  ]);

  /**  Clear touched paths so back-to-back refreshes update entries instead of leaving stale ones until reset. */
  function rebuildMapWithReplacements(
    previous: Map<string, CodexDiffFile>,
    replacements: Array<CodexDiffFile>,
  ): Map<string, CodexDiffFile> {
    const next = new Map(previous);
    for (const key of keysToDelete) {
      next.delete(key);
    }
    for (const file of replacements) {
      next.set(file.metadata.name, file);
    }
    return next;
  }

  return {
    staged: {
      trimmed: rebuildMapWithReplacements(
        previous.staged.trimmed,
        trimmedStaged,
      ),
      full: rebuildMapWithReplacements(previous.staged.full, fullStaged),
    },
    unstaged: {
      trimmed: rebuildMapWithReplacements(
        previous.unstaged.trimmed,
        trimmedUnstaged,
      ),
      full: rebuildMapWithReplacements(previous.unstaged.full, fullUnstaged),
    },
    touchedPaths: new Set<string>([...previous.touchedPaths, ...keysToDelete]),
  };
}
