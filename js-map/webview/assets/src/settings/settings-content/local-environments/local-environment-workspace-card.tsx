import type { ReactElement } from "react";

import FolderIcon from "@/icons/folder.svg";
import WorktreeIcon from "@/icons/worktree.svg";
import type { RepositoryTaskGroups } from "@/sidebar/use-repository-task-groups";

import { getWorkspaceLabel } from "./local-environment-workspace-utils";

export function LocalEnvironmentWorkspaceCard({
  workspaceRoot,
  workspaceGroup,
}: {
  workspaceRoot: string;
  workspaceGroup: RepositoryTaskGroups | null;
}): ReactElement {
  const workspaceLabel = getWorkspaceLabel(workspaceRoot, workspaceGroup);
  const rootFolder = workspaceGroup?.repositoryData?.rootFolder;
  const workspaceDetail =
    rootFolder && rootFolder !== workspaceLabel ? `(${rootFolder})` : null;
  const WorkspaceIcon = workspaceGroup?.isCodexWorktree
    ? WorktreeIcon
    : FolderIcon;

  return (
    <div className="flex items-center gap-3 p-3">
      <WorkspaceIcon className="icon-sm shrink-0 text-token-text-secondary" />
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-1 text-sm text-token-text-primary">
          <span className="truncate">{workspaceLabel}</span>
          {workspaceDetail && (
            <span className="truncate text-xs text-token-description-foreground">
              {workspaceDetail}
            </span>
          )}
        </div>
        <span className="truncate text-xs text-token-text-secondary">
          {workspaceRoot}
        </span>
      </div>
    </div>
  );
}
