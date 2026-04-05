import uniq from "lodash/uniq";
import { isCodexWorktree, type GitRoot, type HostConfig } from "protocol";
import { useMemo } from "react";

import { useGitCurrentBranch } from "@/git-rpc/use-git-current-branch";
import { normalizeFsPath } from "@/utils/path";
import { useFetchFromVSCode } from "@/vscode-api";

export type TargetRootDisplay = {
  label: string;
  gitRoot: GitRoot;
  workspaceRoot: string;
};

/** Selects a worktree for a conversation and exposes an apply handler + status. */
export function useApplyWorktree({
  conversationCwd,
  hostConfig,
}: {
  conversationCwd?: string | null;
  hostConfig: HostConfig;
}): {
  targetRoots: Array<TargetRootDisplay>;
  worktreePath: string | null;
  sourceWorkspaceRoot: string | null;
} {
  const worktreePath = conversationCwd ?? null;
  const { data: codexHomeData } = useFetchFromVSCode("codex-home");
  const codexHome = codexHomeData?.codexHome;
  const { data: workspaceRoots } = useFetchFromVSCode(
    "workspace-root-options",
    { select: ({ roots }) => roots },
  );
  const gitOriginDirs = uniq(
    [worktreePath, ...(workspaceRoots?.filter((root) => root) ?? [])].filter(
      (root): root is string => !!root,
    ),
  );
  const { data: gitOrigins } = useFetchFromVSCode("git-origins", {
    params: { dirs: gitOriginDirs },
    select: ({ origins }) => origins,
    queryConfig: {
      enabled: gitOriginDirs.length > 0,
    },
  });
  const normalizedWorktreePath = worktreePath
    ? normalizeFsPath(worktreePath)
    : null;
  const worktreeOrigin = gitOrigins?.find(
    ({ dir }) => normalizeFsPath(dir) === normalizedWorktreePath,
  );
  const sourceOrigin = useMemo(() => {
    if (!worktreeOrigin?.originUrl) {
      return null;
    }
    const normalizedWorktree = worktreePath
      ? normalizeFsPath(worktreePath)
      : null;
    return (
      gitOrigins?.find((entry) => {
        if (entry.originUrl !== worktreeOrigin.originUrl) {
          return false;
        }
        if (
          normalizedWorktree &&
          normalizeFsPath(entry.dir) === normalizedWorktree
        ) {
          return false;
        }
        return !isCodexWorktree(entry.dir, codexHome);
      }) ?? null
    );
  }, [codexHome, gitOrigins, worktreeOrigin, worktreePath]);

  const sourceGitRoot = sourceOrigin?.root ?? null;
  const sourceWorkspaceRoot = sourceOrigin?.dir ?? null;

  const { data: sourceBranch } = useGitCurrentBranch(
    sourceGitRoot,
    hostConfig,
    {
      enabled: !!sourceGitRoot,
    },
  );

  const targetRoots = useMemo((): Array<TargetRootDisplay> => {
    if (!sourceWorkspaceRoot || !sourceGitRoot) {
      return [];
    }
    return [
      {
        workspaceRoot: sourceWorkspaceRoot,
        gitRoot: sourceGitRoot,
        label: sourceBranch ?? "-",
      },
    ];
  }, [sourceBranch, sourceGitRoot, sourceWorkspaceRoot]);

  return {
    targetRoots,
    worktreePath,
    sourceWorkspaceRoot,
  };
}
