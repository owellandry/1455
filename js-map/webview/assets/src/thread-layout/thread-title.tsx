import type { ReactElement, ReactNode } from "react";
import { FormattedMessage } from "react-intl";

import { Tooltip } from "@/components/tooltip";
import FolderIcon from "@/icons/folder.svg";

import { getProjectName } from "./get-project-name";

export type RepoBranchInfo = {
  projectName: string | null;
  branchName: string | null;
};

/** Shared header title layout: title first, then repo metadata. */
export function ThreadTitle({
  repoBranch,
  title,
  repoPath,
  onProjectClick,
}: {
  repoBranch?: RepoBranchInfo | null;
  title?: ReactNode;
  repoPath?: string | null;
  onProjectClick?: (() => void) | null;
}): ReactElement | null {
  const projectName =
    repoBranch?.projectName != null ? repoBranch.projectName.trim() : "";
  const branchName =
    repoBranch?.branchName != null ? repoBranch.branchName.trim() : "";
  const hasBranch = branchName.length > 0;
  const hasProjectName = projectName.length > 0;
  const hasRepo = hasProjectName;
  const hasTitle = title != null;

  if (!hasRepo && !hasTitle) {
    return null;
  }

  return (
    <div className="flex min-w-0 items-baseline gap-2">
      {hasTitle ? (
        <div className="min-w-[2ch] flex-1 truncate text-token-foreground">
          {title}
        </div>
      ) : null}
      {hasRepo ? (
        <div className="flex min-w-[2ch] shrink basis-auto items-center gap-1 overflow-hidden whitespace-nowrap text-token-description-foreground">
          {hasProjectName ? (
            <RepoName
              projectName={projectName}
              repoPath={repoPath ?? null}
              onProjectClick={onProjectClick ?? null}
            />
          ) : null}
          {hasBranch ? (
            <span className="min-w-0 truncate">
              <FormattedMessage
                id="threadTitle.branchName"
                defaultMessage="({branchName})"
                description="Branch label next to the project name"
                values={{ branchName }}
              />
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function RepoName({
  projectName,
  repoPath,
  onProjectClick,
}: {
  projectName: string;
  repoPath: string | null;
  onProjectClick: (() => void) | null;
}): ReactElement {
  const label = (
    <span className="block min-w-0 truncate whitespace-nowrap">
      {projectName}
    </span>
  );

  if (!repoPath && !onProjectClick) {
    return label;
  }

  const content = onProjectClick ? (
    <button
      type="button"
      className="no-drag max-w-full truncate text-left whitespace-nowrap hover:text-token-foreground focus-visible:underline focus-visible:outline-none"
      onClick={onProjectClick}
    >
      {label}
    </button>
  ) : (
    label
  );

  if (!repoPath) {
    return content;
  }

  return (
    <Tooltip
      tooltipContent={
        <RepoTooltip
          repoPath={repoPath}
          canOpenFolder={onProjectClick != null}
        />
      }
    >
      {content}
    </Tooltip>
  );
}

function RepoTooltip({
  repoPath,
  canOpenFolder,
}: {
  repoPath: string;
  canOpenFolder: boolean;
}): ReactElement {
  return (
    <div className="flex max-w-xs items-center gap-1.5 truncate">
      {canOpenFolder ? (
        <span className="text-xs leading-4 font-medium whitespace-nowrap">
          <FormattedMessage
            id="threadTitle.openFolderInFinder"
            defaultMessage="Open folder"
            description="Tooltip label for opening the project folder in Finder"
          />
        </span>
      ) : null}
      <span className="truncate font-mono text-xs leading-4" title={repoPath}>
        {repoPath}
      </span>
    </div>
  );
}

export function ThreadProjectTooltip({
  repoPath,
}: {
  repoPath: string;
}): ReactElement {
  const projectName = getProjectName(repoPath) ?? repoPath;
  return (
    <div className="flex max-w-xs items-center gap-1.5 truncate">
      <FolderIcon className="icon-xs shrink-0 text-token-foreground" />
      <span
        className="truncate text-xs leading-4 font-medium"
        title={projectName}
      >
        {projectName}
      </span>
    </div>
  );
}
