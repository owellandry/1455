import type { ReactElement } from "react";

import FolderOpenIcon from "@/icons/folder-open.svg";
import FolderRemoteIcon from "@/icons/folder-remote.svg";
import FolderIcon from "@/icons/folder.svg";
import WorktreeIcon from "@/icons/worktree.svg";

export function WorkspaceRootIcon({
  isCodexWorktree,
  isRemoteProject = false,
  isOpen = false,
  className,
}: {
  isCodexWorktree: boolean;
  isRemoteProject?: boolean;
  isOpen?: boolean;
  className?: string;
}): ReactElement {
  if (isCodexWorktree) {
    return <WorktreeIcon className={className} />;
  }

  if (isRemoteProject) {
    return <FolderRemoteIcon className={className} />;
  }

  if (isOpen) {
    return <FolderOpenIcon className={className} />;
  }

  return <FolderIcon className={className} />;
}
