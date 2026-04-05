import { normalizePath } from "@/utils/path";

export function resolveRepoRootFromGitDir(
  gitDir: string | null,
): string | null {
  if (!gitDir) {
    return null;
  }
  const normalized = normalizePath(gitDir).replace(/\/+$/, "");
  const worktreesToken = "/.git/worktrees/";
  const worktreesIndex = normalized.indexOf(worktreesToken);
  if (worktreesIndex !== -1) {
    return normalized.slice(0, worktreesIndex);
  }
  const gitSuffix = "/.git";
  if (normalized.endsWith(gitSuffix)) {
    return normalized.slice(0, -gitSuffix.length);
  }
  return null;
}

export function resolveCodexWorktreeRoot(
  cwd: string | null | undefined,
  worktreesSegment: string | null | undefined,
): string | null {
  if (!cwd || !worktreesSegment) {
    return null;
  }
  const normalizedCwd = normalizePath(cwd).replace(/\/+$/, "");
  const normalizedSegment = normalizePath(worktreesSegment).replace(/\/+$/, "");
  const prefix = `${normalizedSegment}/`;
  if (!normalizedCwd.startsWith(prefix)) {
    return null;
  }
  const segments = normalizedCwd
    .slice(prefix.length)
    .split("/")
    .filter(Boolean);
  if (segments.length < 2) {
    return null;
  }
  return `${normalizedSegment}/${segments[0]}/${segments[1]}`;
}
