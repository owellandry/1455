import clsx from "clsx";
import { createConversationId, isCodexWorktree } from "protocol";
import type { FormEvent, MouseEvent, ReactElement } from "react";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router";

import { useAppServerManagerForConversationIdOrDefault } from "@/app-server/app-server-manager-hooks";
import { getSubagentSourceMetadata } from "@/app-server/utils/get-subagent-source-metadata";
import { Button } from "@/components/button";
import {
  ContextMenu,
  type AppContextMenuItem,
} from "@/components/context-menu";
import { Dialog } from "@/components/dialog";
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSection,
} from "@/components/dialog-layout";
import { CloudTaskRow } from "@/header/recent-tasks-menu/cloud-task-row";
import { mapMergedTask } from "@/header/recent-tasks-menu/map-merged-task";
import type {
  LocalMergedTask,
  PendingWorktreeTask,
  RemoteMergedTask,
} from "@/header/recent-tasks-menu/use-merge-tasks";
import { WorktreeInitRow } from "@/header/recent-tasks-menu/worktree-init-row";
import { useStartNewConversation } from "@/hooks/use-start-new-conversation";
import ChevronRightIcon from "@/icons/chevron-right.svg";
import WorktreeIcon from "@/icons/worktree.svg";
import { getLocalConversationTitle } from "@/local-conversation/get-local-conversation-title";
import {
  getAgentMentionColorCssValueForSessionId,
  getAgentMentionForSessionId,
} from "@/local-conversation/items/multi-agent-mentions";
import { threadActionMessages } from "@/local-conversation/thread-actions";
import { DEFAULT_HOST_ID } from "@/shared-objects/use-host-config";
import {
  buildPinIndicatorNodes,
  pinMessageDescriptor,
  setThreadPinned,
  unpinMessageDescriptor,
} from "@/sidebar/pin-indicator";
import {
  LocalTaskRowWithMenu,
  ThreadRowActionsMenu,
} from "@/sidebar/sidebar-task-row";
import type { SidebarThreadItem } from "@/sidebar/sidebar-thread-items";
import { useSidebarTaskPrChip } from "@/sidebar/use-sidebar-task-pr-chip";
import { usePendingWorktreeActions } from "@/worktrees-v2/pending-worktree-store";

export type SidebarThreadRowOptions = {
  isGrouped?: boolean;
  hideWorktreeIcon?: boolean;
  onActivateGroup?: () => void;
  onActivateThread?: (threadKey: string) => void;
  onStartNewConversation?: () => void;
  showRemoteActionsMenu?: boolean;
  codexHome?: string;
  expandedSubagentParentId?: string | null;
  hasSubagentChildren?: (threadId: string) => boolean;
  onToggleSubagentChildren?: (parentThreadId: string) => void;
};

export function SidebarThreadRow({
  item,
  isActive,
  isGrouped = false,
  hideWorktreeIcon = false,
  onActivateGroup,
  onActivateThread,
  onStartNewConversation,
  showRemoteActionsMenu = false,
  codexHome,
  expandedSubagentParentId,
  hasSubagentChildren,
  onToggleSubagentChildren,
  onArchiveStart,
  onArchiveSuccess,
  onArchiveError,
}: {
  item: SidebarThreadItem;
  isActive: boolean;
  isGrouped?: boolean;
  hideWorktreeIcon?: boolean;
  onActivateGroup?: () => void;
  onActivateThread?: (threadKey: string) => void;
  onStartNewConversation?: () => void;
  showRemoteActionsMenu?: boolean;
  codexHome?: string;
  expandedSubagentParentId?: string | null;
  hasSubagentChildren?: (threadId: string) => boolean;
  onToggleSubagentChildren?: (parentThreadId: string) => void;
  onArchiveStart: () => void;
  onArchiveSuccess: () => void;
  onArchiveError: () => void;
}): ReactElement | null {
  const intl = useIntl();
  const navigate = useNavigate();
  const {
    cancelPendingWorktree,
    renamePendingWorktree,
    setPendingWorktreePinned,
  } = usePendingWorktreeActions();
  const prIconBadge = useSidebarTaskPrChip(item.task);
  const extraIconBadges = prIconBadge != null ? [prIconBadge] : undefined;
  const localConversationId =
    item.task.kind === "local" ? item.task.conversation.id : null;
  const mcpManager =
    useAppServerManagerForConversationIdOrDefault(localConversationId);
  const startNewConversation = useStartNewConversation();
  const [isRenamingPendingWorktree, setIsRenamingPendingWorktree] =
    useState(false);
  const [pendingWorktreeDraftTitle, setPendingWorktreeDraftTitle] =
    useState("");
  function renderPendingWorktreeRow(
    pendingTask: PendingWorktreeTask,
  ): ReactElement {
    const pendingWorktree = pendingTask.pendingWorktree;
    const isPinned = item.isPinned;
    const handleArchive = (): void => {
      onArchiveStart();
      cancelPendingWorktree(pendingWorktree.id);
      onArchiveSuccess();
    };
    const handleRenameOpen = (): void => {
      setPendingWorktreeDraftTitle(pendingWorktree.label);
      setIsRenamingPendingWorktree(true);
    };
    const handleRenameSubmit = (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const nextLabel = pendingWorktreeDraftTitle.trim();
      if (nextLabel.length === 0) {
        setIsRenamingPendingWorktree(false);
        setPendingWorktreeDraftTitle("");
        return;
      }
      const previousLabel = pendingWorktree.label.trim();
      if (nextLabel === previousLabel) {
        setIsRenamingPendingWorktree(false);
        setPendingWorktreeDraftTitle("");
        return;
      }
      renamePendingWorktree(pendingWorktree.id, nextLabel);
      setIsRenamingPendingWorktree(false);
      setPendingWorktreeDraftTitle("");
    };
    const pinIndicatorNodes = buildPinIndicatorNodes({
      isPinned,
      indicatorLocation: "start",
      hasUnreadTurn: pendingWorktree.needsAttention,
      ariaLabel: intl.formatMessage(
        isPinned ? unpinMessageDescriptor : pinMessageDescriptor,
      ),
      onPin: () => {
        setPendingWorktreePinned(pendingWorktree.id, true);
      },
      onUnpin: () => {
        setPendingWorktreePinned(pendingWorktree.id, false);
      },
    });
    const handleClick = onActivateGroup
      ? (): void => {
          onActivateThread?.(`pending:${pendingWorktree.id}`);
          onActivateGroup();
          void navigate(`/worktree-init-v2/${pendingWorktree.id}`);
        }
      : undefined;
    const handleRowDoubleClick = (event: MouseEvent<HTMLDivElement>): void => {
      if (event.defaultPrevented) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-thread-title]")) {
        return;
      }
      handleRenameOpen();
    };
    const getContextMenuItems = (): Array<AppContextMenuItem> => [
      isPinned
        ? {
            id: "unpin-thread",
            message: unpinMessageDescriptor,
            onSelect: (): void => {
              setPendingWorktreePinned(pendingWorktree.id, false);
            },
          }
        : {
            id: "pin-thread",
            message: pinMessageDescriptor,
            onSelect: (): void => {
              setPendingWorktreePinned(pendingWorktree.id, true);
            },
          },
      {
        id: "rename-thread",
        message: threadActionMessages.renameThread,
        onSelect: handleRenameOpen,
      },
      ...(pendingWorktree.phase === "failed"
        ? [
            {
              id: "archive-thread",
              message: threadActionMessages.archiveThread,
              onSelect: handleArchive,
            },
          ]
        : []),
    ];
    return (
      <>
        <ContextMenu getItems={getContextMenuItems}>
          <WorktreeInitRow
            task={pendingWorktree}
            isActive={isActive}
            hasAttention={pendingWorktree.needsAttention}
            indicatorRestNode={pinIndicatorNodes.rest}
            indicatorHoverNode={pinIndicatorNodes.hover}
            onClick={handleClick}
            onDoubleClick={handleRowDoubleClick}
            onArchive={handleArchive}
          />
        </ContextMenu>

        <Dialog
          open={isRenamingPendingWorktree}
          onOpenChange={(open) => {
            setIsRenamingPendingWorktree(open);
            if (!open) {
              setPendingWorktreeDraftTitle("");
            }
          }}
          size="compact"
        >
          <form onSubmit={handleRenameSubmit} className="flex flex-col gap-0">
            <DialogBody>
              <DialogSection>
                <DialogHeader
                  title={
                    <FormattedMessage
                      {...threadActionMessages.renameDialogTitle}
                    />
                  }
                  subtitle={
                    <FormattedMessage
                      {...threadActionMessages.renameDialogSubtitle}
                    />
                  }
                />
              </DialogSection>
              <DialogSection className="gap-2">
                <input
                  className="rounded-xl border border-token-border px-3 py-2 text-base text-token-input-foreground shadow-sm outline-none"
                  value={pendingWorktreeDraftTitle}
                  onChange={(event) => {
                    setPendingWorktreeDraftTitle(event.target.value);
                  }}
                  placeholder={intl.formatMessage(
                    threadActionMessages.renameDialogPlaceholder,
                  )}
                  aria-label={intl.formatMessage(
                    threadActionMessages.renameDialogAriaLabel,
                  )}
                  onFocus={(event) => {
                    event.currentTarget.select();
                  }}
                  autoFocus
                />
              </DialogSection>
              <DialogSection>
                <DialogFooter>
                  <Button
                    color="outline"
                    type="button"
                    onClick={() => setIsRenamingPendingWorktree(false)}
                  >
                    <FormattedMessage
                      {...threadActionMessages.renameDialogCancel}
                    />
                  </Button>
                  <Button color="primary" type="submit">
                    <FormattedMessage
                      {...threadActionMessages.renameDialogSave}
                    />
                  </Button>
                </DialogFooter>
              </DialogSection>
            </DialogBody>
          </form>
        </Dialog>
      </>
    );
  }

  function renderRemoteRow(remoteTask: RemoteMergedTask): ReactElement {
    const isPinned = item.isPinned;
    const pinIndicatorNodes = buildPinIndicatorNodes({
      isPinned,
      indicatorLocation: "start",
      hasUnreadTurn: remoteTask.task.has_unread_turn,
      ariaLabel: intl.formatMessage(
        isPinned ? unpinMessageDescriptor : pinMessageDescriptor,
      ),
      onPin: () => setThreadPinned(remoteTask.task.id, true),
      onUnpin: () => setThreadPinned(remoteTask.task.id, false),
    });
    const contextMenuItems = [
      isPinned
        ? {
            id: "unpin-thread",
            message: unpinMessageDescriptor,
            onSelect: (): void => {
              void setThreadPinned(remoteTask.task.id, false);
            },
          }
        : {
            id: "pin-thread",
            message: pinMessageDescriptor,
            onSelect: (): void => {
              void setThreadPinned(remoteTask.task.id, true);
            },
          },
    ];
    return (
      <CloudTaskRow
        task={remoteTask.task}
        isActive={isActive}
        onSelect={() => {
          onActivateThread?.(`remote:${remoteTask.task.id}`);
        }}
        onClose={() => {}}
        contextMenuItems={contextMenuItems}
        envIconLocation="end"
        indicatorLocation="start"
        diffStyle="color"
        indicatorRestNode={pinIndicatorNodes.rest}
        indicatorHoverNode={pinIndicatorNodes.hover}
        onArchiveStart={onArchiveStart}
        onArchiveSuccess={onArchiveSuccess}
        onArchiveError={onArchiveError}
        extraIconBadges={extraIconBadges}
        renderActions={
          showRemoteActionsMenu
            ? ({
                requestArchive,
                confirmArchive,
                confirmingArchive,
                canArchive,
              }): ReactElement => (
                <ThreadRowActionsMenu
                  requestArchive={requestArchive}
                  confirmArchive={confirmArchive}
                  confirmingArchive={confirmingArchive}
                  canArchive={canArchive}
                />
              )
            : undefined
        }
      />
    );
  }

  function renderLocalRow(localTask: LocalMergedTask): ReactElement {
    const isPinned = item.isPinned;
    const isSubagentChild = item.subagentParentThreadId != null;
    const hasUnreadIndicator = isSubagentChild
      ? false
      : localTask.conversation.hasUnreadTurn;
    const canPin = !isSubagentChild;
    const isRemoteHost = localTask.conversation.hostId !== DEFAULT_HOST_ID;
    const codexLocalWorktree =
      isCodexWorktree(localTask.conversation.cwd, codexHome) && !isRemoteHost;
    const envIconLocation =
      isGrouped && codexLocalWorktree && hideWorktreeIcon ? "none" : "end";
    const onClick = isGrouped ? onActivateGroup : undefined;
    const onStartNewThread = onStartNewConversation ?? startNewConversation;
    const threadId = localTask.conversation.id;
    const canToggleSubagentChildren =
      !isSubagentChild && hasSubagentChildren?.(threadId) === true;
    const showWorktreeIconInBadges =
      codexLocalWorktree &&
      canToggleSubagentChildren &&
      envIconLocation === "end";
    const isSubagentParentExpanded = expandedSubagentParentId === threadId;
    const subagentToggleIndicatorAriaLabel = intl.formatMessage(
      isSubagentParentExpanded
        ? {
            id: "sidebarThreadRow.collapseSubagentChildren",
            defaultMessage: "Collapse agent threads",
            description:
              "Aria label for the left sidebar button that collapses visible sub-agent child rows.",
          }
        : {
            id: "sidebarThreadRow.expandSubagentChildren",
            defaultMessage: "Expand agent threads",
            description:
              "Aria label for the left sidebar button that expands visible sub-agent child rows.",
          },
    );
    const subagentToggleIndicator = canToggleSubagentChildren
      ? {
          id: "subagent-toggle",
          ariaLabel: subagentToggleIndicatorAriaLabel,
          className:
            "pointer-events-none opacity-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100",
          icon: (
            <ChevronRightIcon
              className={clsx(
                "block shrink-0 text-token-foreground/50 hover:text-token-foreground",
                isSubagentParentExpanded ? "-rotate-90" : "rotate-90",
              )}
            />
          ),
          onClick: (): void => {
            onToggleSubagentChildren?.(threadId);
          },
          tooltipContent: subagentToggleIndicatorAriaLabel,
        }
      : null;
    const extraIconBadges = [
      ...(subagentToggleIndicator != null ? [subagentToggleIndicator] : []),
      ...(showWorktreeIconInBadges
        ? [
            {
              id: "worktree-environment",
              icon: <WorktreeIcon />,
              tooltipContent: localTask.conversation.cwd ?? null,
            },
          ]
        : []),
      ...(prIconBadge != null ? [prIconBadge] : []),
    ];
    const pinIndicatorNodes = canPin
      ? buildPinIndicatorNodes({
          isPinned,
          indicatorLocation: "start",
          hasUnreadTurn: hasUnreadIndicator,
          ariaLabel: intl.formatMessage(
            isPinned ? unpinMessageDescriptor : pinMessageDescriptor,
          ),
          onPin: () => setThreadPinned(localTask.conversation.id, true),
          onUnpin: () => setThreadPinned(localTask.conversation.id, false),
        })
      : { rest: null, hover: null };
    const indicatorRestNode = pinIndicatorNodes.rest;
    const indicatorHoverNode = pinIndicatorNodes.hover;
    const subagentTitleOverride = isSubagentChild
      ? getSubagentTitleOverride({
          conversationId: threadId,
          isClosedSubagent: item.isClosedSubagent,
          agentNickname:
            getSubagentSourceMetadata(localTask.conversation.source)
              ?.agentNickname ?? null,
          title: getLocalConversationTitle(
            localTask.conversation,
            item.subagentParentThreadId != null
              ? (mcpManager.getConversation(
                  createConversationId(item.subagentParentThreadId),
                ) ?? null)
              : null,
          ),
        })
      : undefined;
    const titleOverride = subagentTitleOverride ?? item.automationDisplayName;
    return (
      <LocalTaskRowWithMenu
        conversation={localTask.conversation}
        isAutomationRun={item.isAutomationRun}
        hasPendingChildApproval={item.hasSubagentChildPendingApproval}
        isActive={isActive}
        forceLoadingIndicator={
          isSubagentChild && item.subagentProjectedIsActive
        }
        className={item.isClosedSubagent ? "opacity-50" : undefined}
        envIconLocation={showWorktreeIconInBadges ? "none" : envIconLocation}
        indicatorLocation="start"
        indicatorRestNode={indicatorRestNode}
        indicatorHoverNode={indicatorHoverNode}
        indicatorSlotClassName={isSubagentChild ? "ml-5" : undefined}
        titleOverride={titleOverride}
        diffStyle="color"
        isPinned={isPinned}
        canPin={canPin}
        isGrouped={isGrouped}
        blurOnClick={canToggleSubagentChildren}
        onStartNewThread={onStartNewThread}
        onSelect={() => {
          if (!isSubagentChild && isActive && canToggleSubagentChildren) {
            onToggleSubagentChildren?.(threadId);
            return;
          }
          onActivateThread?.(`local:${localTask.conversation.id}`);
        }}
        onClick={onClick}
        onArchiveStart={onArchiveStart}
        onArchiveSuccess={onArchiveSuccess}
        onArchiveError={onArchiveError}
        extraIconBadges={extraIconBadges}
      />
    );
  }

  return mapMergedTask(item.task, {
    "pending-worktree": renderPendingWorktreeRow,
    remote: renderRemoteRow,
    local: renderLocalRow,
  });
}

function getSubagentTitleOverride({
  conversationId,
  isClosedSubagent,
  agentNickname,
  title,
}: {
  conversationId: string;
  isClosedSubagent: boolean;
  agentNickname: string | null;
  title: string | null;
}): ReactElement | null {
  if (title == null) {
    return null;
  }

  const mention =
    (agentNickname != null
      ? agentNickname.startsWith("@")
        ? agentNickname.slice(1)
        : agentNickname
      : null) ?? getAgentMentionForSessionId(conversationId);
  const sidebarMention = mention.startsWith("@") ? mention.slice(1) : mention;
  return (
    <span className="flex min-w-0 items-center">
      <span className="truncate">{title}</span>
      <span
        className="ml-1 shrink-0"
        style={
          isClosedSubagent
            ? undefined
            : {
                color: getAgentMentionColorCssValueForSessionId(conversationId),
              }
        }
      >
        <FormattedMessage
          id="sidebarThreadRow.subagentBracketedName"
          defaultMessage="{name}"
          description="Sub-agent name shown after a thread title in the left sidebar"
          values={{ name: sidebarMention }}
        />
      </span>
    </span>
  );
}
