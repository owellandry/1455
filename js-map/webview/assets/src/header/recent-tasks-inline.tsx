import type { UseQueryResult } from "@tanstack/react-query";
import uniqBy from "lodash/uniqBy";
import type { TaskListItem } from "protocol";
import type React from "react";
import { FormattedMessage } from "react-intl";
import { useLocation, useNavigate } from "react-router";

import { isLocalConversationInProgress } from "@/app-server/utils/is-local-conversation-in-progress";
import { Button } from "@/components/button";
import { useWindowType } from "@/hooks/use-window-type";
import { FetchError } from "@/web-fetch-wrapper";
import { usePendingWorktreeActions } from "@/worktrees-v2/pending-worktree-store";

import { CloudTaskRow } from "./recent-tasks-menu/cloud-task-row";
import { LocalTaskRow } from "./recent-tasks-menu/local-task-row";
import { mapMergedTask } from "./recent-tasks-menu/map-merged-task";
import type { MergedTask } from "./recent-tasks-menu/use-merge-tasks";
import { WorktreeInitRow } from "./recent-tasks-menu/worktree-init-row";

export function RecentTasksInline({
  mergedTasks,
  tasksQuery,
}: {
  mergedTasks: Array<MergedTask>;
  tasksQuery: UseQueryResult<Array<TaskListItem>, Error>;
}): React.ReactElement | null {
  const navigate = useNavigate();
  const location = useLocation();
  const windowType = useWindowType();
  const { cancelPendingWorktree } = usePendingWorktreeActions();

  if (tasksQuery.isLoading && mergedTasks.length === 0) {
    return null;
  }

  // Free accounts or accounts with no tasks will return a 404.
  const is404 =
    tasksQuery.error instanceof FetchError && tasksQuery.error.status === 404;

  if (tasksQuery.isError && mergedTasks.length === 0 && !is404) {
    return (
      <div className="mb-2 flex items-center gap-2 text-base text-token-input-placeholder-foreground">
        <FormattedMessage
          id="codex.recentTasksMenu.errorCloud.inline"
          defaultMessage="Failed to load cloud tasks."
          description="Inline error indicator for cloud tasks in recent feed"
        />
        <Button
          size="default"
          color="outline"
          onClick={() => tasksQuery.refetch()}
        >
          <FormattedMessage
            id="codex.common.retry"
            defaultMessage="Retry"
            description="Retry button"
          />
        </Button>
      </div>
    );
  }

  if (mergedTasks.length === 0) {
    return null;
  }

  const prioritizedTasks = mergedTasks.filter(isPendingOrUnread);
  const visibleTasks =
    windowType === "extension"
      ? uniqBy([...prioritizedTasks, ...mergedTasks], (task) => task.key).slice(
          0,
          Math.max(3, prioritizedTasks.length),
        )
      : mergedTasks;
  const showSeeAll =
    windowType === "extension"
      ? mergedTasks.length > visibleTasks.length
      : false;

  return (
    <div className="group/inline -mx-[var(--padding-row-x)] flex flex-col gap-px rounded-xl pb-1 transition-colors">
      {visibleTasks.map((item) =>
        mapMergedTask(item, {
          remote: (task) => (
            <CloudTaskRow
              isActive={location.pathname === `/remote/${task.task.id}`}
              key={task.key}
              task={task.task}
              onClose={() => {}}
            />
          ),
          local: (task) => (
            <LocalTaskRow
              isActive={location.pathname === `/local/${task.conversation.id}`}
              key={task.key}
              conversation={task.conversation}
              onClick={() => navigate(`/local/${task.conversation.id}`)}
            />
          ),
          "pending-worktree": (task) => (
            <WorktreeInitRow
              key={task.key}
              task={task.pendingWorktree}
              hasAttention={task.pendingWorktree.needsAttention}
              onClick={() =>
                navigate(`/worktree-init-v2/${task.pendingWorktree.id}`)
              }
              onArchive={() => {
                cancelPendingWorktree(task.pendingWorktree.id);
              }}
            />
          ),
        }),
      )}
      {showSeeAll && (
        <div
          className="flex w-full cursor-pointer items-center gap-0 rounded-md px-[var(--padding-row-x)] py-1 text-sm opacity-40 hover:opacity-80"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("open-recent-tasks-menu"));
          }}
        >
          <FormattedMessage
            id="header.recentTasks.seeAll"
            defaultMessage="View all ({total})"
            description="See all recent tasks link with total count"
            values={{ total: mergedTasks.length }}
          />
        </div>
      )}
    </div>
  );
}

function isPendingOrUnread(task: MergedTask): boolean {
  if (task.kind === "remote") {
    const status =
      task.task.task_status_display?.latest_turn_status_display?.turn_status;
    return (
      task.task.has_unread_turn === true ||
      status === "in_progress" ||
      status === "pending"
    );
  }
  if (task.kind === "local" && task.conversation.hasUnreadTurn) {
    return true;
  }
  if (task.kind === "local") {
    return isLocalConversationInProgress(task.conversation);
  }
  if (task.kind === "pending-worktree") {
    return true;
  }
  return false;
}
