import type { GhPullRequestBoardItem } from "protocol";
import { parseRepoFromRemoteUrl } from "protocol";

import type { RepositoryTaskGroups } from "@/sidebar/use-repository-task-groups";
import { getComparableFsPath } from "@/utils/path";

export type PullRequestBoardRepoOption = {
  cwd: string;
  hostId?: string;
  key: string;
  label: string;
  repo: string;
};

export type PullRequestBoardColumn = {
  key: GhPullRequestBoardItem["state"];
  items: Array<GhPullRequestBoardItem>;
};

const BOARD_COLUMN_ORDER = [
  "draft",
  "in_progress",
  "failing",
  "ready",
  "merged",
] satisfies Array<GhPullRequestBoardItem["state"]>;

export function buildPullRequestBoardRepoOptions({
  gitOrigins,
  workspaceGroups,
}: {
  gitOrigins: Array<{
    dir: string;
    originUrl: string | null;
  }>;
  workspaceGroups: Array<RepositoryTaskGroups>;
}): Array<PullRequestBoardRepoOption> {
  const originByDir = new Map(
    gitOrigins.flatMap((gitOrigin) => {
      if (gitOrigin.originUrl == null) {
        return [];
      }
      return [[getComparableFsPath(gitOrigin.dir), gitOrigin.originUrl]];
    }),
  );
  const repoOptionsByRepo = new Map<
    string,
    { isCodexWorktree: boolean; option: PullRequestBoardRepoOption }
  >();

  for (const workspaceGroup of workspaceGroups) {
    const ownerRepo = workspaceGroup.repositoryData?.ownerRepo;
    if (ownerRepo == null) {
      continue;
    }

    const originUrl = originByDir.get(getComparableFsPath(workspaceGroup.path));
    if (originUrl == null) {
      continue;
    }

    const parsedRepo = parseRepoFromRemoteUrl(originUrl);
    if (parsedRepo == null) {
      continue;
    }

    const repoLabel = `${ownerRepo.owner}/${ownerRepo.repoName}`;
    const repo =
      parsedRepo.host === "github.com"
        ? repoLabel
        : `${parsedRepo.host}/${repoLabel}`;
    const nextOption = {
      cwd: workspaceGroup.path,
      hostId: workspaceGroup.hostId,
      key: repo,
      label: repoLabel,
      repo,
    } satisfies PullRequestBoardRepoOption;
    const existingOption = repoOptionsByRepo.get(repo);
    if (
      existingOption == null ||
      shouldPreferPullRequestBoardRepoOption({
        currentCwd: existingOption.option.cwd,
        currentIsCodexWorktree: existingOption.isCodexWorktree,
        nextCwd: nextOption.cwd,
        nextIsCodexWorktree: workspaceGroup.isCodexWorktree,
      })
    ) {
      repoOptionsByRepo.set(repo, {
        isCodexWorktree: workspaceGroup.isCodexWorktree,
        option: nextOption,
      });
    }
  }

  return Array.from(repoOptionsByRepo.values())
    .map((entry) => entry.option)
    .sort((first, second) => first.label.localeCompare(second.label));
}

export function getSelectedPullRequestBoardRepoOption({
  repoOptions,
  requestedRepoKey,
}: {
  repoOptions: Array<PullRequestBoardRepoOption>;
  requestedRepoKey: string | null;
}): PullRequestBoardRepoOption | null {
  return (
    repoOptions.find((repoOption) => repoOption.key === requestedRepoKey) ??
    repoOptions[0] ??
    null
  );
}

export function buildPullRequestBoardColumns(
  items: Array<GhPullRequestBoardItem>,
): Array<PullRequestBoardColumn> {
  return BOARD_COLUMN_ORDER.map((columnKey) => ({
    key: columnKey,
    items: items.filter((item) => item.state === columnKey),
  })).filter((column) => column.items.length > 0);
}

export function getHiddenPullRequestBoardStates(
  items: Array<GhPullRequestBoardItem>,
): Array<GhPullRequestBoardItem["state"]> {
  if (items.length === 0) {
    return [];
  }

  const visibleColumnKeys = new Set(
    buildPullRequestBoardColumns(items).map((column) => column.key),
  );

  return BOARD_COLUMN_ORDER.filter((columnKey) => {
    return !visibleColumnKeys.has(columnKey);
  });
}

function shouldPreferPullRequestBoardRepoOption({
  currentCwd,
  currentIsCodexWorktree,
  nextCwd,
  nextIsCodexWorktree,
}: {
  currentCwd: string;
  currentIsCodexWorktree: boolean;
  nextCwd: string;
  nextIsCodexWorktree: boolean;
}): boolean {
  if (currentIsCodexWorktree !== nextIsCodexWorktree) {
    return !nextIsCodexWorktree;
  }

  if (currentCwd.length !== nextCwd.length) {
    return nextCwd.length > currentCwd.length;
  }

  return nextCwd.localeCompare(currentCwd) < 0;
}
