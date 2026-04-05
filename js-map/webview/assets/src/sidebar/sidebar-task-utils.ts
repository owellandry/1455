import type { MergedTask } from "@/header/recent-tasks-menu/use-merge-tasks";

export function isUnreadTask(task: MergedTask): boolean {
  if (task.kind === "remote") {
    return Boolean(task.task.has_unread_turn);
  }
  if (task.kind === "local") {
    return Boolean(task.conversation.hasUnreadTurn);
  }
  if (task.kind === "pending-worktree") {
    return Boolean(task.pendingWorktree.needsAttention);
  }
  return false;
}

export function isTaskInProgress(task: MergedTask): boolean {
  if (task.kind === "remote") {
    const turnStatus =
      task.task.task_status_display?.latest_turn_status_display?.turn_status;
    return turnStatus === "in_progress" || turnStatus === "pending";
  }
  if (task.kind === "local") {
    if (task.conversation.resumeState === "needs_resume") {
      return false;
    }
    if (task.conversation.turns.length === 0) {
      return task.conversation.resumeState === "resuming";
    }
    const lastTurn =
      task.conversation.turns[task.conversation.turns.length - 1] ?? null;
    if (!lastTurn) {
      return true;
    }
    return lastTurn.status === "inProgress";
  }
  return true;
}
