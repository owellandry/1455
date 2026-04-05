import type {
  LocalMergedTask,
  MergedTask,
  PendingWorktreeTask,
  RemoteMergedTask,
} from "./use-merge-tasks";

type MergedTaskMap<T> = {
  remote: (task: RemoteMergedTask) => T;
  local: (task: LocalMergedTask) => T;
  "pending-worktree": (task: PendingWorktreeTask) => T;
};

export function mapMergedTask<T>(
  task: MergedTask,
  handlers: MergedTaskMap<T>,
): T {
  switch (task.kind) {
    case "remote":
      return handlers.remote(task);
    case "local":
      return handlers.local(task);
    case "pending-worktree":
      return handlers["pending-worktree"](task);
  }
}
