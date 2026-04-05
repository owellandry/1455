import isEqual from "lodash/isEqual";
import { createGitRoot, type GitRoot, type VSCodeFetchRequest } from "protocol";
import { useEffect, useEffectEvent, useState } from "react";

import { fetchFromVSCode, useFetchFromVSCode } from "@/vscode-api";

import { logger } from "./logger";
import { parseOwnerRepo } from "./parse-owner-repo";
import { useEnvironment } from "./use-environment";

export function useGitRootFromEnvironment(): string | null {
  const environment = useEnvironment();
  const cloneUrl = environment?.repo_map?.[environment?.repos[0]]?.clone_url;
  return useGitRoot(cloneUrl);
}

export function useGitRoot(cloneUrl: string | undefined): string | null {
  const [gitRoot, setGitRoot] = useState<string | null>(null);

  const updateGitRoot = useEffectEvent(async (cloneUrl: string | undefined) => {
    if (!cloneUrl) {
      setGitRoot(null);
      return;
    }
    const gitRoot = await gitRootForOriginUrl(cloneUrl);
    setGitRoot(gitRoot);
  });

  useEffect(() => {
    void updateGitRoot(cloneUrl);
  }, [cloneUrl]);
  return gitRoot;
}

export async function gitRootForOriginUrl(
  originUrl: string | undefined,
): Promise<string | null> {
  const workspaceRoots = await fetchFromVSCode("active-workspace-roots");
  if (!originUrl || !workspaceRoots) {
    return null;
  }
  const origins = await fetchFromVSCode("git-origins");
  return gitRootForWorkspaceRoots(
    originUrl,
    workspaceRoots.roots,
    origins.origins,
  );
}

/**
 * Looks through workspace roots and finds the git root that has an origin url that matches the same owner as the target origin url.
 */
export async function gitRootForWorkspaceRoots(
  originUrl: string,
  workspaceRoots: Array<string>,
  origins: VSCodeFetchRequest["git-origins"]["response"]["origins"] | undefined,
): Promise<string | null> {
  const targetRepoOwner = parseOwnerRepo(originUrl);
  const matchingOrigin = (origins ?? []).find((o) =>
    o.originUrl ? isEqual(parseOwnerRepo(o.originUrl), targetRepoOwner) : false,
  );
  if (!matchingOrigin) {
    logger.warning(`No matching origin found`, {
      safe: {},
      sensitive: { originUrl: originUrl },
    });
    return workspaceRoots[0] ?? null;
  }
  return matchingOrigin.root;
}

export function useGitRootForCwd(
  cwd: string | null | undefined,
  options?: { enabled?: boolean; hostId?: string },
): { gitRoot: GitRoot | null; isLoading: boolean } {
  const isEnabled = !!cwd && (options?.enabled ?? true);
  const params =
    cwd == null
      ? { dirs: [] }
      : options?.hostId == null
        ? { dirs: [cwd] }
        : { dirs: [cwd], hostId: options.hostId };
  const { data, isLoading } = useFetchFromVSCode("git-origins", {
    params,
    queryConfig: { enabled: isEnabled },
    placeholderData: (prev) => prev ?? { origins: [], homeDir: "" },
  });
  const gitRoot =
    data?.origins.find((origin) => origin.dir === cwd)?.root ??
    data?.origins[0]?.root ??
    null;

  return { gitRoot: gitRoot ? createGitRoot(gitRoot) : null, isLoading };
}
