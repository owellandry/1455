import type { HostConfig } from "./host-config";

/**
 * `git rev-parse --git-common-dir` normalized to an absolute path.
 * This will be the same for all worktrees linked to the same repository.
 */
export type GitCommonDir = string & { readonly _brand: unique symbol };

/**
 * `git rev-parse --show-toplevel` normalized to an absolute path.
 */
export type GitRoot = string & { readonly _brand: unique symbol };

/**
 * Absolute path to a repo root or any subdirectory of a repo root.
 */
export type GitCwd = (string & { readonly _brand: unique symbol }) | GitRoot;

export type GitCommitSha = string & { readonly _brand: unique symbol };

export type GitTreeSha = string & { readonly _brand: unique symbol };

/** Short branch name (`feature/foo` not `refs/heads/feature/foo`) */
export type GitShortBranch = string & { readonly _brand: unique symbol };

export type GitSha = GitCommitSha | GitTreeSha;

export type GitRef = GitSha | GitShortBranch;

export type BaseGitRequest = {
  hostConfig: HostConfig | null;
  /**
   * Host id of the window context that owns this request.
   *
   * This disambiguates remote host ids that can be managed by multiple window
   * contexts at the same time.
   */
  windowHostId?: string | null;
};

export function createGitCommonDir(commonDir: string): GitCommonDir {
  return commonDir as GitCommonDir;
}

export function createGitRoot(gitRoot: string): GitRoot {
  return gitRoot as GitRoot;
}

export function createGitCwd(cwd: string): GitCwd {
  return cwd as GitCwd;
}

export function createGitCommitSha(commitSha: string): GitCommitSha {
  return commitSha as GitCommitSha;
}

export function createGitTreeSha(treeSha: string): GitTreeSha {
  return treeSha as GitTreeSha;
}

export function createGitSha(sha: string): GitSha {
  return sha as GitSha;
}

export function createGitShortBranch(shortBranch: string): GitShortBranch {
  return shortBranch as GitShortBranch;
}

export function createGitRef(ref: string): GitRef {
  return ref as GitRef;
}
