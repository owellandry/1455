import { isCodexWorktree, type ConversationId } from "protocol";

import type { MergedTask } from "@/header/recent-tasks-menu/use-merge-tasks";
import { isConversationAwaitingApproval } from "@/local-conversation/pending-request";
import { persistedAtom } from "@/utils/persisted-atom";

import { isTaskInProgress, isUnreadTask } from "./sidebar-task-utils";

export type WorkspaceTaskFilter = "all" | "relevant";

export const DEFAULT_WORKSPACE_TASK_FILTER: WorkspaceTaskFilter = "all";

export const aWorkspaceTaskFilter = persistedAtom<WorkspaceTaskFilter>(
  "sidebar-workspace-filter-v2",
  DEFAULT_WORKSPACE_TASK_FILTER,
);

export function isTaskRelevant(
  task: MergedTask,
  currentConversationId: ConversationId | null,
  branch: string | null,
  codexHome: string | undefined,
): boolean {
  if (isCurrentConversation(task, currentConversationId)) {
    return true;
  }
  if (isCodexWorktreeTask(task, codexHome)) {
    return true;
  }
  if (hasPendingApprovalRequest(task)) {
    return true;
  }
  if (isUnreadTask(task) || isTaskInProgress(task)) {
    return true;
  }
  if (!isTaskOnCurrentBranch(task, branch)) {
    return false;
  }
  if (!isTaskRecent(task)) {
    return false;
  }
  return true;
}

function isTaskRecent(task: MergedTask): boolean {
  const fourDaysAgo = Date.now() - 4 * 24 * 60 * 60 * 1000;
  return task.at >= fourDaysAgo;
}

function isCodexWorktreeTask(
  task: MergedTask,
  codexHome: string | undefined,
): boolean {
  if (task.kind === "pending-worktree") {
    return true;
  } else if (task.kind !== "local") {
    return false;
  }
  return isCodexWorktree(task.conversation.cwd ?? "", codexHome);
}

function hasPendingApprovalRequest(task: MergedTask): boolean {
  if (task.kind !== "local") {
    return false;
  }
  return isConversationAwaitingApproval(task.conversation);
}

function isTaskOnCurrentBranch(
  task: MergedTask,
  branch: string | null,
): boolean {
  if (!branch) {
    // If we don't know, return true. This is the case for non-git tasks.
    return true;
  }
  const taskBranch = getTaskBranch(task);
  if (!taskBranch) {
    // If we don't know, return true. This is the case for non-git tasks or for
    // other unknown missing data.
    // They will eventually time out after the 4 day check if it's wrong.
    return true;
  }
  return taskBranch === branch;
}

function getTaskBranch(task: MergedTask): string | null {
  switch (task.kind) {
    case "remote":
      return task.task.task_status_display?.branch_name ?? null;
    case "local":
      return task.conversation.gitInfo?.branch ?? null;
    case "pending-worktree":
      return task.pendingWorktree.startingState.type === "branch"
        ? task.pendingWorktree.startingState.branchName
        : null;
  }
}

function isCurrentConversation(
  task: MergedTask,
  currentConversationId: ConversationId | null,
): boolean {
  if (!currentConversationId || task.kind !== "local") {
    return false;
  }
  return task.conversation.id === currentConversationId;
}
