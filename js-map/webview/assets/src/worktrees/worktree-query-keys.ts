import { GIT_QUERY_KEY_PREFIX } from "@/git-rpc/git-api";

export function codexWorktreesQueryKey(hostKey: string): Array<unknown> {
  return [GIT_QUERY_KEY_PREFIX, hostKey, "codex-worktrees"];
}

export function worktreeSnapshotRefQueryKey(
  hostKey: string | undefined,
  cwd?: string | null,
): Array<unknown> {
  const base = [GIT_QUERY_KEY_PREFIX, hostKey, "worktree-snapshot-ref"];
  return cwd ? [...base, cwd] : base;
}
