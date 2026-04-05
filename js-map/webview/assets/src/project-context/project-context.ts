import { isCodexWorktree } from "protocol";

import type { GitStableMetadata } from "@/git-rpc/use-git-stable-metadata";

type ProjectContextBase = {
  codexHome: string | null;
};

type BuildProjectContextParams = {
  codexHome: string | null;
  cwd: string | null;
  gitMetadata: GitStableMetadata | null;
};

export type ProjectContext =
  | (ProjectContextBase & {
      kind: "none";
      cwd: null;
      git: null;
      isCodexWorktree: false;
    })
  | (ProjectContextBase & {
      kind: "plain";
      cwd: string;
      git: null;
      isCodexWorktree: false;
    })
  | (ProjectContextBase & {
      kind: "git";
      cwd: string;
      git: GitStableMetadata;
      isCodexWorktree: boolean;
    });

export function buildProjectContext({
  codexHome,
  cwd,
  gitMetadata,
}: BuildProjectContextParams): ProjectContext {
  if (cwd == null) {
    return {
      kind: "none",
      codexHome,
      cwd: null,
      git: null,
      isCodexWorktree: false,
    };
  }

  if (gitMetadata == null) {
    return {
      kind: "plain",
      codexHome,
      cwd,
      git: null,
      isCodexWorktree: false,
    };
  }

  return {
    kind: "git",
    codexHome,
    cwd,
    git: gitMetadata,
    isCodexWorktree: isCodexWorktree(cwd, codexHome ?? undefined),
  };
}
