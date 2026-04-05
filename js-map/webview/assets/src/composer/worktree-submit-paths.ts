export function resolveWorktreeSubmitPaths({
  worktreeSourceCwd,
  worktreeRepoRoot,
}: {
  worktreeSourceCwd: string;
  worktreeRepoRoot: string | null;
}): {
  worktreeGitContextRoot: string;
  workspaceRootForSubmit: string;
} {
  return {
    worktreeGitContextRoot: worktreeRepoRoot ?? worktreeSourceCwd,
    workspaceRootForSubmit: worktreeSourceCwd,
  };
}
