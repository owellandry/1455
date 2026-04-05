import type { MouseEventHandler, ReactElement, ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router";

import { FormattedRelativeDateTime } from "@/components/format-relative-date-time";
import { threadActionMessages } from "@/local-conversation/thread-actions";
import type { PendingWorktree } from "@/worktrees-v2/pending-worktree-store";

import { TaskRowLayout, type TaskRowStatusState } from "./task-row-layout";

export function WorktreeInitRow({
  task,
  envIconLocation = "end",
  indicatorLocation = "start",
  isActive = false,
  hasAttention = false,
  indicatorRestNode,
  indicatorHoverNode,
  onClick,
  onDoubleClick,
  onArchive,
  onContextMenu,
}: {
  task: Pick<PendingWorktree, "id" | "label" | "phase" | "createdAt">;
  envIconLocation?: "end" | "start" | "middle" | "none";
  indicatorLocation?: "end" | "start" | "none";
  isActive?: boolean;
  hasAttention?: boolean;
  indicatorRestNode?: ReactNode;
  indicatorHoverNode?: ReactNode;
  onClick?: () => void;
  onDoubleClick?: MouseEventHandler<HTMLDivElement>;
  onArchive?: () => void;
  onContextMenu?: MouseEventHandler<HTMLDivElement>;
}): ReactElement {
  const intl = useIntl();
  const navigate = useNavigate();
  const isInitFailed = task.phase === "failed";
  const isPending = task.phase === "queued" || task.phase === "creating";

  const statusState: TaskRowStatusState = isPending
    ? { type: "loading", unread: hasAttention }
    : isInitFailed
      ? { type: "error", unread: hasAttention }
      : { type: "idle", unread: hasAttention };

  const handleClick = (): void => {
    if (onClick) {
      onClick();
      return;
    }
    void navigate(`/worktree-init-v2/${task.id}`);
  };

  return (
    <TaskRowLayout
      isActive={isActive}
      title={
        isInitFailed ? (
          <FormattedMessage
            id="recentTasks.worktreeInitFailedTitle"
            defaultMessage="Worktree init failed"
            description="Worktree row title when the init script fails"
          />
        ) : (
          task.label
        )
      }
      metaContent={
        <FormattedRelativeDateTime
          dateString={new Date(task.createdAt).toISOString()}
        />
      }
      envType="worktree"
      envIconLocation={envIconLocation}
      pulseEnvIcon={isPending}
      indicatorLocation={indicatorLocation}
      indicatorRestNode={indicatorRestNode}
      indicatorHoverNode={indicatorHoverNode}
      statusState={statusState}
      onArchive={onArchive}
      archiveAriaLabel={
        onArchive
          ? intl.formatMessage(threadActionMessages.archiveThread)
          : undefined
      }
      archiveConfirmLabel={
        onArchive ? (
          <FormattedMessage
            id="codex.localTaskRow.confirmArchiveTask"
            defaultMessage="Confirm"
            description="Confirmation button for archiving a local task"
          />
        ) : undefined
      }
      onClick={handleClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    />
  );
}
