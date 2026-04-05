import type { GitCwd, GitRoot, WorkerRequestResult } from "protocol";

import { joinRootAndPath, normalizeFsPath, normalizePath } from "@/utils/path";

type GitWorktreeEntry = WorkerRequestResult<
  "git",
  "list-worktrees"
>["worktrees"][number];

export type MoveToLocalTarget = {
  gitRoot: GitRoot;
  workspaceRoot: string;
};

export function getMoveToLocalTargets({
  cwd,
  sourceWorktreeRoot,
  repoWorktreeEntries,
}: {
  cwd: GitCwd;
  sourceWorktreeRoot: GitCwd;
  repoWorktreeEntries: Array<GitWorktreeEntry> | undefined;
}): Array<MoveToLocalTarget> {
  const sourceRelativeWorkspacePath = getSourceWorktreeRelativePath({
    cwd,
    sourceWorktreeRoot,
  });
  const normalizedSourceWorktreeRoot = normalizeFsPath(sourceWorktreeRoot);

  return (repoWorktreeEntries ?? [])
    .filter((entry) => {
      const normalizedRoot = normalizeFsPath(entry.root);
      if (normalizedRoot === normalizedSourceWorktreeRoot) {
        return false;
      }
      return true;
    })
    .map((entry) => {
      const workspaceRoot =
        sourceRelativeWorkspacePath.length > 0
          ? joinRootAndPath(entry.root, sourceRelativeWorkspacePath)
          : entry.root;
      return {
        gitRoot: entry.root,
        workspaceRoot,
      };
    });
}

/**
 * Returns the relative path from the source worktree root to the current working directory.
 * Works for linux and windows paths.
 */
export function getSourceWorktreeRelativePath({
  cwd,
  sourceWorktreeRoot,
}: {
  cwd: GitCwd;
  sourceWorktreeRoot: GitCwd;
}): string {
  const normalizedCwd = normalizePath(cwd);
  const normalizedSourceRoot = normalizePath(sourceWorktreeRoot).replace(
    /\/+$/,
    "",
  );
  const normalizedCwdForComparison = normalizeFsPath(cwd);
  const normalizedSourceRootForComparison = normalizeFsPath(
    sourceWorktreeRoot,
  ).replace(/\/+$/, "");

  if (normalizedCwdForComparison === normalizedSourceRootForComparison) {
    return "";
  }

  const sourcePrefixForComparison = `${normalizedSourceRootForComparison}/`;
  if (!normalizedCwdForComparison.startsWith(sourcePrefixForComparison)) {
    return "";
  }

  const sourcePrefix = `${normalizedSourceRoot}/`;
  return normalizedCwd.slice(sourcePrefix.length);
}
