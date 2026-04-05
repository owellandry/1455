import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useScope } from "maitai";
import type { DiffStats, TaskListItem } from "protocol";
import { FormattedMessage, defineMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router";

import { ArchiveInfoMessage } from "@/components/archive-info-message";
import {
  ContextMenu,
  type AppContextMenuItem,
} from "@/components/context-menu";
import { FormattedRelativeDateTime } from "@/components/format-relative-date-time";
import { toast$ } from "@/components/toaster/toast-signal";
import { useWindowType } from "@/hooks/use-window-type";
import { AppScope } from "@/scopes/app-scope";
import { CodexRequest } from "@/utils/request";
import { useStreamLastTurnEvent } from "@/utils/use-stream-turn";

import {
  TaskRowLayout,
  type TaskRowIconBadgeDescriptor,
} from "./task-row-layout";
import { useArchiveState } from "./use-archive-state";

const archiveTaskMessage = defineMessage({
  id: "codex.cloudTaskRow.archiveTask",
  defaultMessage: "Archive task",
  description: "Label for archiving a cloud task",
});

export function CloudTaskRow({
  task,
  onClose,
  onSelect,
  isActive = false,
  envIconLocation = "end",
  hideMeta = false,
  indicatorLocation = "end",
  diffStyle = "color",
  indicatorRestNode,
  indicatorHoverNode,
  renderActions,
  metaHidden = false,
  extraIconBadges,
  contextMenuItems,
  onArchiveStart,
  onArchiveSuccess,
  onArchiveError,
}: {
  task: TaskListItem;
  onClose: () => void;
  onSelect?: () => void;
  isActive?: boolean;
  envIconLocation?: "end" | "start" | "middle" | "none";
  hideMeta?: boolean;
  indicatorLocation?: "end" | "start" | "none";
  diffStyle?: "color" | "monochrome";
  indicatorRestNode?: React.ReactNode;
  indicatorHoverNode?: React.ReactNode;
  renderActions?: React.ComponentProps<typeof TaskRowLayout>["renderActions"];
  metaHidden?: boolean;
  extraIconBadges?: Array<TaskRowIconBadgeDescriptor>;
  contextMenuItems?: Array<AppContextMenuItem>;
  onArchiveStart?: () => void;
  onArchiveSuccess?: () => void;
  onArchiveError?: () => void;
}): React.ReactElement | null {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const onClick = (): void => {
    onSelect?.();
    onClose();
    void navigate(`/remote/${id}`);
  };

  const { id, title } = task;
  const turnStatus =
    task.task_status_display?.latest_turn_status_display?.turn_status;
  const isInProgress = turnStatus === "in_progress" || turnStatus === "pending";
  const hasFailed = turnStatus === "failed";
  const latestTurn = task.task_status_display?.latest_turn_status_display;
  const latestEvent = useStreamLastTurnEvent(
    task.id,
    turnStatus ?? null,
    latestTurn?.turn_id ?? null,
  );
  const timestampSeconds = task.updated_at ?? task.created_at ?? null;
  const taskTimestamp = timestampSeconds
    ? new Date(timestampSeconds * 1000)
    : null;
  const diff = turnStatus === "completed" ? getDiff(task) : null;
  const diffStats =
    diff &&
    !isInProgress &&
    ((diff.lines_added ?? 0) > 0 || (diff.lines_removed ?? 0) > 0)
      ? {
          linesAdded: diff.lines_added ?? 0,
          linesRemoved: diff.lines_removed ?? 0,
        }
      : null;
  const statusType = isInProgress ? "loading" : hasFailed ? "error" : "idle";
  const metaContent = hideMeta ? null : taskTimestamp ? (
    <FormattedRelativeDateTime dateString={taskTimestamp.toISOString()} />
  ) : (
    (latestEvent ?? "")
  );
  const metaState = taskTimestamp
    ? "default"
    : isInProgress
      ? "loading"
      : "default";
  const canArchive = !isInProgress && !!taskTimestamp;
  const windowType = useWindowType();

  const {
    archived,
    usesExternalArchiveHandling,
    beginArchive,
    handleArchiveSuccess,
    handleArchiveError,
  } = useArchiveState({
    onArchiveStart,
    onArchiveSuccess,
    onArchiveError,
  });
  const archiveTask = useMutation({
    mutationFn: () =>
      CodexRequest.safePost("/wham/tasks/{task_id}/archive", {
        parameters: {
          path: { task_id: id },
        },
      }),
    onSuccess: () => {
      handleArchiveSuccess();
      const openSettings = (): void => {
        void navigate("/settings/data-controls");
      };
      scope
        .get(toast$)
        .info(
          <ArchiveInfoMessage
            windowType={windowType}
            onOpenSettings={openSettings}
          />,
          { id: "archive-task" },
        );
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["task", id] });
    },
    onError: () => {
      handleArchiveError();
      scope.get(toast$).danger(
        intl.formatMessage({
          id: "cloudTaskRow.archiveError",
          defaultMessage: "Failed to archive task",
          description: "Error message when archiving a Codex task",
        }),
      );
    },
  });

  const handleArchive = (): void => {
    beginArchive();
    archiveTask.mutate();
  };

  if (archived && !usesExternalArchiveHandling) {
    // Optimistic archive state so archive is snappy.
    return null;
  }

  const taskRow = (
    <TaskRowLayout
      isActive={isActive}
      onClick={onClick}
      indicatorLocation={indicatorLocation}
      indicatorRestNode={indicatorRestNode}
      indicatorHoverNode={indicatorHoverNode}
      statusState={{ type: statusType, unread: task.has_unread_turn }}
      envType="cloud"
      envIconLocation={envIconLocation}
      title={
        title ?? (
          <FormattedMessage
            id="codex.taskRow.title"
            defaultMessage="New thread"
            description="Default title for a Codex thread that doesn't have a title"
          />
        )
      }
      iconBadges={extraIconBadges}
      diffStats={diffStats}
      diffStyle={diffStyle}
      metaHidden={metaHidden}
      metaContent={metaContent}
      metaState={metaState}
      onArchive={canArchive ? handleArchive : null}
      archiveAriaLabel={intl.formatMessage(archiveTaskMessage)}
      archiveConfirmLabel={
        <FormattedMessage
          id="codex.cloudTaskRow.confirmArchiveTask"
          defaultMessage="Confirm"
          description="Confirmation button for archiving a cloud task"
        />
      }
      renderActions={renderActions}
    />
  );

  if (contextMenuItems === undefined) {
    return taskRow;
  }

  if (contextMenuItems.length === 0 && !canArchive) {
    return taskRow;
  }

  const getContextMenuItems = (): Array<AppContextMenuItem> => {
    const menuItems = [...contextMenuItems];
    if (canArchive) {
      menuItems.push({
        id: "archive-task",
        message: archiveTaskMessage,
        onSelect: handleArchive,
      });
    }
    return menuItems;
  };

  return <ContextMenu getItems={getContextMenuItems}>{taskRow}</ContextMenu>;
}

function getDiff(task: TaskListItem): DiffStats | null {
  return (
    task?.task_status_display?.latest_turn_status_display?.diff_stats ?? null
  );
}
