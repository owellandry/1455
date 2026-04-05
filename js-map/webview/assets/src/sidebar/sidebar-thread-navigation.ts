import type { MergedTask } from "@/header/recent-tasks-menu/use-merge-tasks";
import {
  asUnpinnedItems,
  getSidebarThreadKey,
  type SidebarThreadItem,
} from "@/sidebar/sidebar-thread-items";
import type { RepositoryTaskGroups } from "@/sidebar/use-repository-task-groups";

export function buildSidebarThreadOrder({
  pinnedItems,
  showRecent,
  recentItems,
  groups,
  isBackgroundSubagentsEnabled = true,
}: {
  pinnedItems: Array<SidebarThreadItem>;
  showRecent: boolean;
  recentItems: Array<SidebarThreadItem>;
  groups: Array<RepositoryTaskGroups>;
  isBackgroundSubagentsEnabled?: boolean;
}): Array<SidebarThreadItem> {
  const ordered: Array<SidebarThreadItem> = [];
  for (const item of pinnedItems) {
    ordered.push(item);
  }
  if (showRecent) {
    for (const item of recentItems) {
      ordered.push(item);
    }
    return ordered;
  }
  for (const group of groups) {
    const groupItems = asUnpinnedItems(group.tasks, {
      isBackgroundSubagentsEnabled,
    });
    for (const item of groupItems) {
      ordered.push(item);
    }
  }
  return ordered;
}

export function getSidebarThreadKeyFromRouteIds({
  localId,
  remoteId,
  pendingId,
}: {
  localId?: string | null;
  remoteId?: string | null;
  pendingId?: string | null;
}): string | null {
  if (localId) {
    return `local:${localId}`;
  }
  if (remoteId) {
    return `remote:${remoteId}`;
  }
  if (pendingId) {
    return `pending:${pendingId}`;
  }
  return null;
}

export function shouldAutoExpandThreadList<T>({
  items,
  currentThreadKey,
  maxItems,
  getTask,
}: {
  items: Array<T>;
  currentThreadKey: string | null;
  maxItems: number;
  getTask: (item: T) => MergedTask;
}): boolean {
  if (currentThreadKey == null) {
    return false;
  }
  let index = 0;
  for (const item of items) {
    if (getSidebarThreadKey(getTask(item)) === currentThreadKey) {
      return index >= maxItems;
    }
    index += 1;
  }
  return false;
}

export function navigateToSidebarThread(
  item: SidebarThreadItem,
  navigateToLocalConversation: (conversationId: string) => void,
  navigate: (path: string) => void,
): void {
  if (item.task.kind === "local") {
    navigateToLocalConversation(item.task.conversation.id);
    return;
  }
  if (item.task.kind === "remote") {
    navigate(`/remote/${item.task.task.id}`);
    return;
  }
  if (item.task.kind === "pending-worktree") {
    navigate(`/worktree-init-v2/${item.task.pendingWorktree.id}`);
  }
}
