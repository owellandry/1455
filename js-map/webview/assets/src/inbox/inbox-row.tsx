import clsx from "clsx";
import type { AutomationRunStatus } from "protocol";
import type { ReactElement, ReactNode } from "react";

import {
  ContextMenu,
  type AppContextMenuItem,
} from "@/components/context-menu";
import { FormattedRelativeDateTime } from "@/components/format-relative-date-time";
import { Spinner } from "@/components/spinner";
import { useListItemButton } from "@/hooks/use-list-item-button";
import ArchiveIcon from "@/icons/archive.svg";
import CheckCircleFilledIcon from "@/icons/check-circle-filled.svg";
import { isInboxArchived, isInboxRunning } from "@/inbox/inbox-status";

export function InboxRow({
  itemId,
  title,
  subtitle,
  workspaceLabel,
  leadingIcon,
  timestamp,
  threadId,
  isActive = false,
  isUnread = false,
  archiveLabel,
  onMarkRead,
  onMarkUnread,
  onArchive,
  onSelect,
  isDimmed = false,
  status,
  className,
  titleClassName,
  showArchiveAction = true,
}: {
  itemId: string | null;
  title: ReactNode;
  subtitle?: ReactNode;
  workspaceLabel?: ReactNode;
  leadingIcon?: ReactNode;
  timestamp: Date;
  threadId?: string | null;
  isActive?: boolean;
  isUnread?: boolean;
  archiveLabel: string;
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
  onArchive?: (threadId: string) => void;
  onSelect?: () => void;
  isDimmed?: boolean;
  status?: AutomationRunStatus | null;
  className?: string;
  titleClassName?: string;
  showArchiveAction?: boolean;
}): ReactElement {
  const isDisabled = onSelect == null;
  const canArchive = showArchiveAction && threadId != null && onArchive != null;
  const buttonProps = useListItemButton({ onSelect, isDisabled });
  const isRunning = isInboxRunning(status ?? null);
  const isArchived = isInboxArchived(status ?? null);
  let indicatorNode: ReactNode = null;
  if (leadingIcon != null) {
    indicatorNode = leadingIcon;
  } else if (itemId == null || isRunning) {
    indicatorNode = <Spinner className="icon-xs shrink-0" />;
  } else if (isUnread) {
    indicatorNode = (
      <span
        className={clsx(
          "h-2 w-2 rounded-full",
          isArchived
            ? "bg-token-error-foreground"
            : "bg-token-text-link-foreground",
        )}
      />
    );
  } else {
    indicatorNode = isArchived ? (
      <ArchiveIcon className="icon-xs shrink-0 text-token-disabled-foreground" />
    ) : (
      <CheckCircleFilledIcon className="icon-xs shrink-0 text-token-disabled-foreground" />
    );
  }
  const row = (
    <div role="listitem">
      <div
        className={clsx(
          "group flex items-center gap-2 rounded-md pl-2 pr-3 py-2 text-base [content-visibility:auto] [contain-intrinsic-size:auto_64px]",
          isDimmed && "opacity-60",
          isDisabled ? "cursor-default opacity-50" : "cursor-interaction",
          isActive
            ? "bg-token-list-active-selection-background"
            : "hover:bg-token-list-hover-background",
          className,
        )}
        {...buttonProps}
      >
        <div className="flex w-5 shrink-0 items-center justify-center text-token-description-foreground">
          {indicatorNode}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={clsx(
                  "truncate text-token-foreground",
                  isUnread ? "font-medium" : "font-normal",
                  titleClassName,
                )}
              >
                {title}
              </span>
              {workspaceLabel ? (
                <span className="truncate text-sm text-token-description-foreground">
                  {workspaceLabel}
                </span>
              ) : null}
            </div>
            {subtitle != null ? (
              <span className="truncate text-sm font-normal text-token-description-foreground">
                {subtitle}
              </span>
            ) : null}
          </div>
          <div className="relative flex min-w-[4.5rem] items-center justify-end self-center">
            <span
              className={clsx(
                "whitespace-nowrap text-sm tabular-nums text-token-description-foreground transition-opacity",
                canArchive && "group-hover:opacity-0",
              )}
            >
              <FormattedRelativeDateTime dateString={timestamp.toISOString()} />
            </span>
            {canArchive ? (
              <button
                className="absolute right-0 text-token-description-foreground opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(event) => {
                  event.stopPropagation();
                  if (threadId) {
                    onArchive(threadId);
                  }
                }}
                aria-label={archiveLabel}
                type="button"
              >
                <ArchiveIcon className="icon-sm" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  if (itemId == null) {
    return row;
  }

  const items: Array<AppContextMenuItem> = isUnread
    ? [
        {
          id: "mark-read",
          message: {
            id: "inbox.contextMenu.markRead",
            defaultMessage: "Mark as read",
            description: "Context menu item to mark an inbox row as read",
          },
          onSelect: (): void => {
            onMarkRead(itemId);
          },
        },
      ]
    : [
        {
          id: "mark-unread",
          message: {
            id: "inbox.contextMenu.markUnread",
            defaultMessage: "Mark as unread",
            description: "Context menu item to mark an inbox row as unread",
          },
          onSelect: (): void => {
            onMarkUnread(itemId);
          },
        },
      ];

  return <ContextMenu items={items}>{row}</ContextMenu>;
}
