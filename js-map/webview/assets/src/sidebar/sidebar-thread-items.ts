import type { ConversationId } from "protocol";

import { getSubagentSourceMetadata } from "@/app-server/utils/get-subagent-source-metadata";
import type { MergedTask } from "@/header/recent-tasks-menu/use-merge-tasks";
import { getApprovalPendingRequestFromConversation } from "@/local-conversation/pending-request";
import { isTaskInProgress } from "@/sidebar/sidebar-task-utils";

export type SidebarThreadItem = {
  task: MergedTask;
  isPinned: boolean;
  isAutomationRun: boolean;
  automationDisplayName: string | null;
  subagentParentThreadId: string | null;
  isClosedSubagent: boolean;
  hasSubagentChildPendingApproval: boolean;
  subagentProjectedIsActive: boolean;
};

export type SidebarThreadListEntry =
  | {
      type: "thread";
      item: SidebarThreadItem;
    }
  | {
      type: "closed-subagents-toggle";
      parentThreadId: string;
      hiddenChildCount: number;
      isExpanded: boolean;
    };

function getDefaultSubagentState(): Omit<
  SidebarThreadItem,
  "task" | "isPinned" | "isAutomationRun" | "automationDisplayName"
> {
  return {
    subagentParentThreadId: null,
    isClosedSubagent: false,
    hasSubagentChildPendingApproval: false,
    subagentProjectedIsActive: false,
  };
}

function getDefaultAutomationState(): Pick<
  SidebarThreadItem,
  "isAutomationRun" | "automationDisplayName"
> {
  return {
    isAutomationRun: false,
    automationDisplayName: null,
  };
}

export function getSidebarThreadKey(task: MergedTask): string | null {
  if (task.kind === "local") {
    return `local:${task.conversation.id}`;
  }
  if (task.kind === "remote") {
    return `remote:${task.task.id}`;
  }
  if (task.kind === "pending-worktree") {
    return `pending:${task.pendingWorktree.id}`;
  }
  return null;
}

export function getSidebarSubagentParentIds(
  items: Array<SidebarThreadItem>,
): Set<string> {
  const parentIdsWithChildren = new Set<string>();
  for (const item of items) {
    if (item.subagentParentThreadId != null) {
      parentIdsWithChildren.add(item.subagentParentThreadId);
    }
  }
  return parentIdsWithChildren;
}

export function countSidebarVisibleParentItems(
  items: Array<SidebarThreadItem>,
): number {
  let visibleParentCount = 0;
  for (const item of items) {
    if (item.subagentParentThreadId == null) {
      visibleParentCount += 1;
    }
  }
  return visibleParentCount;
}

export function getSidebarItemsWithinVisibleParentLimit({
  items,
  maxParentItems,
}: {
  items: Array<SidebarThreadItem>;
  maxParentItems: number;
}): Array<SidebarThreadItem> {
  const visibleItems: Array<SidebarThreadItem> = [];
  let visibleParentCount = 0;
  for (const item of items) {
    if (item.subagentParentThreadId == null) {
      if (visibleParentCount >= maxParentItems) {
        break;
      }
      visibleParentCount += 1;
    }
    visibleItems.push(item);
  }
  return visibleItems;
}

export function getSidebarItemsWithClosedSubagentsHidden({
  items,
  currentThreadKey,
  expandedClosedSubagentParents,
}: {
  items: Array<SidebarThreadItem>;
  currentThreadKey: string | null;
  expandedClosedSubagentParents: Record<string, boolean>;
}): {
  items: Array<SidebarThreadItem>;
  hiddenClosedChildCountByParentId: Map<string, number>;
} {
  const visibleItems: Array<SidebarThreadItem> = [];
  const hiddenClosedChildCountByParentId = new Map<string, number>();
  const parentIdsWithMixedClosedAndOpenChildren =
    getParentIdsWithMixedClosedAndOpenChildren(items);

  for (const item of items) {
    const parentThreadId = item.subagentParentThreadId;
    if (
      item.isClosedSubagent &&
      parentThreadId != null &&
      parentIdsWithMixedClosedAndOpenChildren.has(parentThreadId) &&
      expandedClosedSubagentParents[parentThreadId] !== true &&
      getSidebarThreadKey(item.task) !== currentThreadKey
    ) {
      hiddenClosedChildCountByParentId.set(
        parentThreadId,
        (hiddenClosedChildCountByParentId.get(parentThreadId) ?? 0) + 1,
      );
      continue;
    }
    visibleItems.push(item);
  }

  return {
    items: visibleItems,
    hiddenClosedChildCountByParentId,
  };
}

export function buildSidebarThreadListEntries({
  items,
  hiddenClosedChildCountByParentId,
  expandedClosedSubagentParents,
}: {
  items: Array<SidebarThreadItem>;
  hiddenClosedChildCountByParentId: Map<string, number>;
  expandedClosedSubagentParents: Record<string, boolean>;
}): Array<SidebarThreadListEntry> {
  const entries: Array<SidebarThreadListEntry> = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (item == null) {
      continue;
    }

    entries.push({
      type: "thread",
      item,
    });

    const parentThreadId =
      item.subagentParentThreadId ??
      (item.task.kind === "local" ? item.task.conversation.id : null);
    if (parentThreadId == null) {
      continue;
    }

    const hiddenChildCount =
      hiddenClosedChildCountByParentId.get(parentThreadId) ?? 0;
    const hasVisibleClosedChild = hasVisibleClosedSubagentChild({
      items,
      index,
      parentThreadId,
    });
    const shouldShowClosedChildToggle =
      hiddenChildCount > 0 ||
      (expandedClosedSubagentParents[parentThreadId] === true &&
        hasVisibleClosedChild);
    if (!shouldShowClosedChildToggle) {
      continue;
    }

    const nextItem = items[index + 1] ?? null;
    if (nextItem?.subagentParentThreadId === parentThreadId) {
      continue;
    }

    entries.push({
      type: "closed-subagents-toggle",
      parentThreadId,
      hiddenChildCount,
      isExpanded: expandedClosedSubagentParents[parentThreadId] === true,
    });
  }

  return entries;
}

function getParentIdsWithMixedClosedAndOpenChildren(
  items: Array<SidebarThreadItem>,
): Set<string> {
  const parentIdsWithClosedChildren = new Set<string>();
  const parentIdsWithOpenChildren = new Set<string>();

  for (const item of items) {
    const parentThreadId = item.subagentParentThreadId;
    if (parentThreadId == null) {
      continue;
    }
    if (item.isClosedSubagent) {
      parentIdsWithClosedChildren.add(parentThreadId);
      continue;
    }
    parentIdsWithOpenChildren.add(parentThreadId);
  }

  const parentIdsWithMixedClosedAndOpenChildren = new Set<string>();
  for (const parentThreadId of parentIdsWithClosedChildren) {
    if (!parentIdsWithOpenChildren.has(parentThreadId)) {
      continue;
    }
    parentIdsWithMixedClosedAndOpenChildren.add(parentThreadId);
  }

  return parentIdsWithMixedClosedAndOpenChildren;
}

function hasVisibleClosedSubagentChild({
  items,
  index,
  parentThreadId,
}: {
  items: Array<SidebarThreadItem>;
  index: number;
  parentThreadId: string;
}): boolean {
  const item = items[index];
  if (
    item?.subagentParentThreadId === parentThreadId &&
    item.isClosedSubagent
  ) {
    return true;
  }
  for (let previousIndex = index - 1; previousIndex >= 0; previousIndex -= 1) {
    const previousItem = items[previousIndex];
    if (previousItem == null) {
      continue;
    }
    if (previousItem.subagentParentThreadId == null) {
      break;
    }
    if (previousItem.subagentParentThreadId !== parentThreadId) {
      continue;
    }
    if (previousItem.isClosedSubagent) {
      return true;
    }
  }
  for (let nextIndex = index + 1; nextIndex < items.length; nextIndex += 1) {
    const nextItem = items[nextIndex];
    if (nextItem == null) {
      continue;
    }
    if (nextItem.subagentParentThreadId == null) {
      break;
    }
    if (nextItem.subagentParentThreadId !== parentThreadId) {
      continue;
    }
    if (nextItem.isClosedSubagent) {
      return true;
    }
  }
  return false;
}

export function filterSidebarItemsForCurrentSubagentCluster({
  items,
  currentThreadKey,
  expandedSubagentParentId,
}: {
  items: Array<SidebarThreadItem>;
  currentThreadKey: string | null;
  expandedSubagentParentId: string | null;
}): Array<SidebarThreadItem> {
  const parentIdsWithChildren = getSidebarSubagentParentIds(items);

  let currentSubagentClusterParentId: string | null = null;
  let currentThreadIsSubagentChild = false;
  if (currentThreadKey != null) {
    for (const item of items) {
      if (getSidebarThreadKey(item.task) !== currentThreadKey) {
        continue;
      }
      currentSubagentClusterParentId =
        item.subagentParentThreadId ??
        (item.task.kind === "local" &&
        parentIdsWithChildren.has(item.task.conversation.id)
          ? item.task.conversation.id
          : null);
      currentThreadIsSubagentChild = item.subagentParentThreadId != null;
      break;
    }
  }

  if (currentSubagentClusterParentId == null) {
    if (currentThreadKey == null) {
      return items;
    }
    return items.filter((item) => {
      const parentThreadId = item.subagentParentThreadId;
      if (parentThreadId == null) {
        return true;
      }
      const itemThreadKey = getSidebarThreadKey(item.task);
      if (expandedSubagentParentId == null) {
        return itemThreadKey != null && itemThreadKey === currentThreadKey;
      }
      return expandedSubagentParentId === parentThreadId;
    });
  }

  const isCurrentSubagentClusterExpanded =
    expandedSubagentParentId === currentSubagentClusterParentId;
  return items.filter((item) => {
    if (item.subagentParentThreadId == null) {
      return true;
    }
    if (item.subagentParentThreadId !== currentSubagentClusterParentId) {
      return false;
    }
    if (isCurrentSubagentClusterExpanded || currentThreadIsSubagentChild) {
      return true;
    }
    const itemThreadKey = getSidebarThreadKey(item.task);
    return itemThreadKey != null && itemThreadKey === currentThreadKey;
  });
}

export function asUnpinnedItems(
  tasks: Array<MergedTask>,
  {
    allTasks = tasks,
    isBackgroundSubagentsEnabled = true,
  }: {
    allTasks?: Array<MergedTask>;
    isBackgroundSubagentsEnabled?: boolean;
  } = {},
): Array<SidebarThreadItem> {
  if (!isBackgroundSubagentsEnabled) {
    return tasks
      .filter((task) => !isSubagentChildMergedTask(task))
      .map((task) => ({
        task,
        isPinned: false,
        ...getDefaultAutomationState(),
        ...getDefaultSubagentState(),
      }));
  }

  const subagentProjectedActiveByThreadId =
    getSubagentProjectedActiveByThreadId(tasks);
  const closedSubagentByThreadId = getClosedSubagentByThreadId(tasks);
  const ancestorThreadIdsWithPendingSubagentApproval =
    getAncestorThreadIdsWithPendingSubagentApproval(allTasks);
  return tasks.map((task) => ({
    task,
    isPinned: false,
    ...getDefaultAutomationState(),
    subagentParentThreadId: getSubagentParentThreadId(task),
    isClosedSubagent: getSubagentIsClosed(task, { closedSubagentByThreadId }),
    hasSubagentChildPendingApproval:
      task.kind === "local" &&
      ancestorThreadIdsWithPendingSubagentApproval.has(task.conversation.id),
    subagentProjectedIsActive: getSubagentProjectedActive(task, {
      subagentProjectedActiveByThreadId,
      closedSubagentByThreadId,
    }),
  }));
}

export function filterOutPinnedSubagentChildThreadIds({
  mergedTasks,
  pinnedThreadIds,
}: {
  mergedTasks: Array<MergedTask>;
  pinnedThreadIds: Array<string>;
}): Array<string> {
  const subagentChildThreadIds = new Set<string>();
  for (const task of mergedTasks) {
    if (task.kind !== "local") {
      continue;
    }
    if (getSubagentParentThreadId(task) == null) {
      continue;
    }
    subagentChildThreadIds.add(task.conversation.id);
  }
  return pinnedThreadIds.filter((threadId) => {
    return !subagentChildThreadIds.has(threadId);
  });
}

export function buildSidebarThreadItems({
  mergedTasks,
  pinnedThreadIds,
  currentConversationId,
  isBackgroundSubagentsEnabled = true,
  automationThreadIds = new Set<string>(),
  automationDisplayNames = new Map<string, string>(),
}: {
  mergedTasks: Array<MergedTask>;
  pinnedThreadIds: Array<string>;
  currentConversationId: ConversationId | null;
  isBackgroundSubagentsEnabled?: boolean;
  automationThreadIds?: Set<string>;
  automationDisplayNames?: Map<string, string>;
}): {
  pinnedItems: Array<SidebarThreadItem>;
  unpinnedItems: Array<SidebarThreadItem>;
} {
  const visiblePinnedThreadIds = filterOutPinnedSubagentChildThreadIds({
    mergedTasks,
    pinnedThreadIds,
  });
  const pinnedThreadIdSet = new Set(visiblePinnedThreadIds);
  const subagentProjectedActiveByThreadId = isBackgroundSubagentsEnabled
    ? getSubagentProjectedActiveByThreadId(mergedTasks)
    : new Map<string, boolean>();
  const closedSubagentByThreadId = isBackgroundSubagentsEnabled
    ? getClosedSubagentByThreadId(mergedTasks)
    : new Map<string, boolean>();
  const ancestorThreadIdsWithPendingSubagentApproval =
    isBackgroundSubagentsEnabled
      ? getAncestorThreadIdsWithPendingSubagentApproval(mergedTasks)
      : new Set<string>();
  const visibleMergedTasks = filterVisibleMergedTasks({
    tasks: mergedTasks,
    currentConversationId,
    pinnedThreadIdSet,
    isBackgroundSubagentsEnabled,
  });
  const localTaskById = getLocalTaskById(visibleMergedTasks);
  const remoteTaskById = new Map<string, MergedTask>();
  const pinnedItems: Array<SidebarThreadItem> = [];
  for (const task of visibleMergedTasks) {
    if (task.kind === "pending-worktree") {
      if (task.pendingWorktree.isPinned) {
        pinnedItems.push({
          task,
          isPinned: true,
          isAutomationRun: false,
          automationDisplayName: null,
          ...getDefaultSubagentState(),
        });
      }
      continue;
    }
    if (task.kind === "local") {
      localTaskById.set(task.conversation.id, task);
      continue;
    }
    remoteTaskById.set(task.task.id, task);
  }

  const inheritedPinnedThreadIds = new Set<string>();
  for (const threadId of visiblePinnedThreadIds) {
    const localTask = localTaskById.get(threadId);
    if (localTask) {
      pinnedItems.push({
        task: localTask,
        isPinned: true,
        isAutomationRun: automationThreadIds.has(localTask.conversation.id),
        automationDisplayName:
          automationDisplayNames.get(localTask.conversation.id) ?? null,
        ...(isBackgroundSubagentsEnabled
          ? {
              subagentParentThreadId: getSubagentParentThreadId(localTask),
              isClosedSubagent: getSubagentIsClosed(localTask, {
                closedSubagentByThreadId,
              }),
              hasSubagentChildPendingApproval:
                ancestorThreadIdsWithPendingSubagentApproval.has(
                  localTask.conversation.id,
                ),
              subagentProjectedIsActive: getSubagentProjectedActive(localTask, {
                subagentProjectedActiveByThreadId,
                closedSubagentByThreadId,
              }),
            }
          : getDefaultSubagentState()),
      });
      for (const task of visibleMergedTasks) {
        if (task.kind !== "local") {
          continue;
        }
        if (pinnedThreadIdSet.has(task.conversation.id)) {
          continue;
        }
        if (inheritedPinnedThreadIds.has(task.conversation.id)) {
          continue;
        }
        if (getSubagentParentThreadId(task) !== threadId) {
          continue;
        }
        pinnedItems.push({
          task,
          isPinned: false,
          isAutomationRun: automationThreadIds.has(task.conversation.id),
          automationDisplayName:
            automationDisplayNames.get(task.conversation.id) ?? null,
          ...(isBackgroundSubagentsEnabled
            ? {
                subagentParentThreadId: getSubagentParentThreadId(task),
                isClosedSubagent: getSubagentIsClosed(task, {
                  closedSubagentByThreadId,
                }),
                hasSubagentChildPendingApproval:
                  ancestorThreadIdsWithPendingSubagentApproval.has(
                    task.conversation.id,
                  ),
                subagentProjectedIsActive: getSubagentProjectedActive(task, {
                  subagentProjectedActiveByThreadId,
                  closedSubagentByThreadId,
                }),
              }
            : getDefaultSubagentState()),
        });
        inheritedPinnedThreadIds.add(task.conversation.id);
      }
      continue;
    }
    const remoteTask = remoteTaskById.get(threadId);
    if (remoteTask) {
      pinnedItems.push({
        task: remoteTask,
        isPinned: true,
        isAutomationRun: false,
        automationDisplayName: null,
        ...getDefaultSubagentState(),
      });
    }
  }

  const unpinnedItems: Array<SidebarThreadItem> = [];
  for (const task of visibleMergedTasks) {
    if (task.kind === "pending-worktree") {
      if (task.pendingWorktree.isPinned) {
        continue;
      }
      unpinnedItems.push({
        task,
        isPinned: false,
        isAutomationRun: false,
        automationDisplayName: null,
        ...getDefaultSubagentState(),
      });
      continue;
    }
    const threadId = getMergedTaskThreadId(task);
    if (
      threadId != null &&
      (pinnedThreadIdSet.has(threadId) ||
        inheritedPinnedThreadIds.has(threadId))
    ) {
      continue;
    }
    unpinnedItems.push({
      task,
      isPinned: false,
      isAutomationRun:
        task.kind === "local" && automationThreadIds.has(task.conversation.id),
      automationDisplayName:
        task.kind === "local"
          ? (automationDisplayNames.get(task.conversation.id) ?? null)
          : null,
      ...(isBackgroundSubagentsEnabled
        ? {
            subagentParentThreadId: getSubagentParentThreadId(task),
            isClosedSubagent: getSubagentIsClosed(task, {
              closedSubagentByThreadId,
            }),
            hasSubagentChildPendingApproval:
              task.kind === "local" &&
              ancestorThreadIdsWithPendingSubagentApproval.has(
                task.conversation.id,
              ),
            subagentProjectedIsActive: getSubagentProjectedActive(task, {
              subagentProjectedActiveByThreadId,
              closedSubagentByThreadId,
            }),
          }
        : getDefaultSubagentState()),
    });
  }

  return { pinnedItems, unpinnedItems };
}

function getSubagentProjectedActive(
  task: MergedTask,
  {
    subagentProjectedActiveByThreadId,
    closedSubagentByThreadId,
  }: {
    subagentProjectedActiveByThreadId: Map<string, boolean>;
    closedSubagentByThreadId: Map<string, boolean>;
  },
): boolean {
  if (task.kind !== "local") {
    return false;
  }
  if (closedSubagentByThreadId.get(task.conversation.id) === true) {
    return false;
  }
  return subagentProjectedActiveByThreadId.get(task.conversation.id) === true;
}

function getSubagentIsClosed(
  task: MergedTask,
  {
    closedSubagentByThreadId,
  }: {
    closedSubagentByThreadId: Map<string, boolean>;
  },
): boolean {
  if (task.kind !== "local") {
    return false;
  }
  return closedSubagentByThreadId.get(task.conversation.id) === true;
}

function getSubagentProjectedActiveByThreadId(
  tasks: Array<MergedTask>,
): Map<string, boolean> {
  const projectedActiveByThreadId = new Map<string, boolean>();
  for (const task of tasks) {
    if (task.kind !== "local") {
      continue;
    }
    for (const turn of task.conversation.turns) {
      for (const item of turn.items ?? []) {
        if (item?.type !== "collabAgentToolCall") {
          continue;
        }
        for (const receiverThreadId of item.receiverThreadIds) {
          const agentState = item.agentsStates?.[receiverThreadId];
          if (agentState == null) {
            continue;
          }
          projectedActiveByThreadId.set(
            receiverThreadId,
            agentState.status === "running",
          );
        }
      }
    }
  }
  return projectedActiveByThreadId;
}

function getClosedSubagentByThreadId(
  tasks: Array<MergedTask>,
): Map<string, boolean> {
  const closedSubagentByThreadId = new Map<string, boolean>();
  for (const task of tasks) {
    if (task.kind !== "local") {
      continue;
    }
    for (const turn of task.conversation.turns) {
      for (const item of turn.items ?? []) {
        if (item?.type !== "collabAgentToolCall") {
          continue;
        }
        for (const receiverThreadId of item.receiverThreadIds) {
          if (item.tool === "wait") {
            continue;
          }
          closedSubagentByThreadId.set(
            receiverThreadId,
            item.tool === "closeAgent",
          );
        }
      }
    }
  }
  return closedSubagentByThreadId;
}

function getAncestorThreadIdsWithPendingSubagentApproval(
  tasks: Array<MergedTask>,
): Set<string> {
  const localTaskById = new Map<
    string,
    Extract<MergedTask, { kind: "local" }>
  >();
  for (const task of tasks) {
    if (task.kind !== "local") {
      continue;
    }
    localTaskById.set(task.conversation.id, task);
  }

  const ancestorThreadIds = new Set<string>();
  for (const task of tasks) {
    if (
      task.kind !== "local" ||
      getApprovalPendingRequestFromConversation(task.conversation) == null
    ) {
      continue;
    }

    let parentThreadId = getSubagentParentThreadId(task);
    while (parentThreadId != null) {
      ancestorThreadIds.add(parentThreadId);
      parentThreadId = getSubagentParentThreadId(
        localTaskById.get(parentThreadId),
      );
    }
  }

  return ancestorThreadIds;
}

function getMergedTaskThreadId(task: MergedTask): string | null {
  if (task.kind === "local") {
    return task.conversation.id;
  }
  if (task.kind === "remote") {
    return task.task.id;
  }
  return null;
}

function filterVisibleMergedTasks({
  tasks,
  currentConversationId,
  pinnedThreadIdSet,
  isBackgroundSubagentsEnabled,
}: {
  tasks: Array<MergedTask>;
  currentConversationId: ConversationId | null;
  pinnedThreadIdSet: Set<string>;
  isBackgroundSubagentsEnabled: boolean;
}): Array<MergedTask> {
  if (!isBackgroundSubagentsEnabled) {
    return tasks.filter((task) => !isSubagentChildMergedTask(task));
  }
  const currentSubagentParentThreadId =
    getCurrentSubagentParentThreadIdForTasks(tasks, currentConversationId);
  return getVisibleSubagentAwareTasks({
    tasks,
    currentConversationId,
    isBaseVisible: (task) =>
      shouldIncludeTaskInSidebar({
        task,
        currentConversationId,
        currentSubagentParentThreadId,
        pinnedThreadIdSet,
      }),
    isBackgroundSubagentsEnabled,
  });
}

function shouldIncludeTaskInSidebar({
  task,
  currentConversationId,
  currentSubagentParentThreadId,
  pinnedThreadIdSet,
}: {
  task: MergedTask;
  currentConversationId: ConversationId | null;
  currentSubagentParentThreadId: string | null;
  pinnedThreadIdSet: Set<string>;
}): boolean {
  if (!isSubagentChildMergedTask(task)) {
    return true;
  }
  if (task.kind !== "local") {
    return true;
  }
  if (task.conversation.id === currentConversationId) {
    return true;
  }
  if (pinnedThreadIdSet.has(task.conversation.id)) {
    return true;
  }
  if (pinnedThreadIdSet.has(getSubagentParentThreadId(task) ?? "")) {
    return true;
  }
  return shouldForceShowSubagentTask(
    task,
    currentConversationId,
    currentSubagentParentThreadId,
  );
}

function getLocalTaskById(
  tasks: Array<MergedTask>,
): Map<string, Extract<MergedTask, { kind: "local" }>> {
  const localTaskById = new Map<
    string,
    Extract<MergedTask, { kind: "local" }>
  >();
  for (const task of tasks) {
    if (task.kind !== "local") {
      continue;
    }
    localTaskById.set(task.conversation.id, task);
  }
  return localTaskById;
}

function reorderSubagentTasksAfterParents(
  tasks: Array<MergedTask>,
): Array<MergedTask> {
  return reorderSubagentTasksAfterParentsStable(tasks);
}

function reorderSubagentTasksAfterParentsStable(
  tasks: Array<MergedTask>,
): Array<MergedTask> {
  const localThreadIds = new Set<string>();
  const childTasksByParentId = new Map<string, Array<MergedTask>>();
  for (const task of tasks) {
    if (task.kind !== "local") {
      continue;
    }
    localThreadIds.add(task.conversation.id);
  }
  for (const task of tasks) {
    const parentThreadId = getSubagentParentThreadId(task);
    if (parentThreadId == null || !localThreadIds.has(parentThreadId)) {
      continue;
    }
    const siblingTasks = childTasksByParentId.get(parentThreadId) ?? [];
    siblingTasks.push(task);
    childTasksByParentId.set(parentThreadId, siblingTasks);
  }

  const orderedTasks: Array<MergedTask> = [];
  const emittedTaskKeys = new Set<string>();
  for (const task of tasks) {
    const parentThreadId = getSubagentParentThreadId(task);
    if (parentThreadId != null && localThreadIds.has(parentThreadId)) {
      continue;
    }
    orderedTasks.push(task);
    emittedTaskKeys.add(task.key);
    appendVisibleChildTasks(
      task,
      childTasksByParentId,
      orderedTasks,
      emittedTaskKeys,
    );
  }
  for (const task of tasks) {
    if (emittedTaskKeys.has(task.key)) {
      continue;
    }
    orderedTasks.push(task);
    emittedTaskKeys.add(task.key);
    appendVisibleChildTasks(
      task,
      childTasksByParentId,
      orderedTasks,
      emittedTaskKeys,
    );
  }
  return orderedTasks;
}

function appendVisibleChildTasks(
  task: MergedTask,
  childTasksByParentId: Map<string, Array<MergedTask>>,
  orderedTasks: Array<MergedTask>,
  emittedTaskKeys: Set<string>,
): void {
  if (task.kind !== "local") {
    return;
  }
  const childTasks = childTasksByParentId.get(task.conversation.id) ?? [];
  for (const childTask of childTasks) {
    if (emittedTaskKeys.has(childTask.key)) {
      continue;
    }
    orderedTasks.push(childTask);
    emittedTaskKeys.add(childTask.key);
  }
}

function isSubagentChildMergedTask(task: MergedTask): boolean {
  return getSubagentParentThreadId(task) != null;
}

export function getSubagentParentThreadId(
  task: MergedTask | null | undefined,
): string | null {
  if (task == null) {
    return null;
  }
  if (task.kind !== "local") {
    return null;
  }
  return (
    getSubagentSourceMetadata(task.conversation.source)?.parentThreadId ?? null
  );
}

export function getCurrentSubagentParentThreadIdForTasks(
  tasks: Array<MergedTask>,
  currentConversationId: ConversationId | null,
): string | null {
  if (currentConversationId == null) {
    return null;
  }
  for (const task of tasks) {
    if (task.kind !== "local") {
      continue;
    }
    if (task.conversation.id !== currentConversationId) {
      continue;
    }
    return getSubagentParentThreadId(task);
  }
  return null;
}

export function shouldForceShowSubagentTask(
  task: MergedTask,
  currentConversationId: ConversationId | null,
  currentSubagentParentThreadId: string | null,
): boolean {
  if (task.kind !== "local") {
    return false;
  }
  const parentThreadId = getSubagentParentThreadId(task);
  if (parentThreadId == null) {
    return false;
  }
  if (task.conversation.id === currentConversationId) {
    return true;
  }
  if (parentThreadId === currentConversationId) {
    return true;
  }
  if (
    currentSubagentParentThreadId != null &&
    parentThreadId === currentSubagentParentThreadId
  ) {
    return true;
  }
  if (isTaskInProgress(task)) {
    return true;
  }
  return false;
}

export function getVisibleSubagentAwareTasks({
  tasks,
  currentConversationId,
  isBaseVisible,
  isBackgroundSubagentsEnabled = true,
}: {
  tasks: Array<MergedTask>;
  currentConversationId: ConversationId | null;
  isBaseVisible: (task: MergedTask) => boolean;
  isBackgroundSubagentsEnabled?: boolean;
}): Array<MergedTask> {
  if (!isBackgroundSubagentsEnabled) {
    return tasks.filter((task) => isBaseVisible(task));
  }
  const visibleTaskKeys = getVisibleSubagentAwareTaskKeys({
    tasks,
    currentConversationId,
    isBaseVisible,
    isBackgroundSubagentsEnabled,
  });
  return reorderSubagentTasksAfterParents(
    tasks.filter((task) => visibleTaskKeys.has(task.key)),
  );
}

export function getVisibleSubagentAwareTaskKeys({
  tasks,
  currentConversationId,
  isBaseVisible,
  isBackgroundSubagentsEnabled = true,
}: {
  tasks: Array<MergedTask>;
  currentConversationId: ConversationId | null;
  isBaseVisible: (task: MergedTask) => boolean;
  isBackgroundSubagentsEnabled?: boolean;
}): Set<string> {
  if (!isBackgroundSubagentsEnabled) {
    const visibleTaskKeys = new Set<string>();
    for (const task of tasks) {
      if (!isSubagentChildMergedTask(task) && isBaseVisible(task)) {
        visibleTaskKeys.add(task.key);
      }
    }
    return visibleTaskKeys;
  }
  const visibleTaskKeys = new Set<string>();
  const currentSubagentParentThreadId =
    getCurrentSubagentParentThreadIdForTasks(tasks, currentConversationId);
  for (const task of tasks) {
    if (
      isBaseVisible(task) ||
      shouldForceShowSubagentTask(
        task,
        currentConversationId,
        currentSubagentParentThreadId,
      )
    ) {
      visibleTaskKeys.add(task.key);
    }
  }
  includeVisibleSubagentAncestorTaskKeys(tasks, visibleTaskKeys);
  includePendingSubagentApprovalAncestorTaskKeys(tasks, visibleTaskKeys);
  return visibleTaskKeys;
}

export function includeVisibleSubagentAncestorTaskKeys(
  tasks: Array<MergedTask>,
  visibleTaskKeys: Set<string>,
): void {
  const localTaskById = getLocalTaskById(tasks);

  const pendingParentThreadIds: Array<string> = [];
  const enqueuedParentThreadIds = new Set<string>();
  for (const task of tasks) {
    if (!visibleTaskKeys.has(task.key)) {
      continue;
    }
    const parentThreadId = getSubagentParentThreadId(task);
    if (parentThreadId == null || enqueuedParentThreadIds.has(parentThreadId)) {
      continue;
    }
    pendingParentThreadIds.push(parentThreadId);
    enqueuedParentThreadIds.add(parentThreadId);
  }

  while (pendingParentThreadIds.length > 0) {
    const parentThreadId = pendingParentThreadIds.shift();
    if (parentThreadId == null) {
      continue;
    }
    const parentTask = localTaskById.get(parentThreadId);
    if (!parentTask) {
      continue;
    }
    visibleTaskKeys.add(parentTask.key);
    const grandparentThreadId = getSubagentParentThreadId(parentTask);
    if (
      grandparentThreadId == null ||
      enqueuedParentThreadIds.has(grandparentThreadId)
    ) {
      continue;
    }
    pendingParentThreadIds.push(grandparentThreadId);
    enqueuedParentThreadIds.add(grandparentThreadId);
  }
}

function includePendingSubagentApprovalAncestorTaskKeys(
  tasks: Array<MergedTask>,
  visibleTaskKeys: Set<string>,
): void {
  const ancestorThreadIds =
    getAncestorThreadIdsWithPendingSubagentApproval(tasks);
  if (ancestorThreadIds.size === 0) {
    return;
  }

  for (const task of tasks) {
    if (task.kind !== "local") {
      continue;
    }
    if (ancestorThreadIds.has(task.conversation.id)) {
      visibleTaskKeys.add(task.key);
    }
  }
}
