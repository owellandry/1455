import clsx from "clsx";
import { createGitCwd } from "protocol";
import {
  useState,
  type ComponentProps,
  type FormEvent,
  type MouseEvent,
  type ReactElement,
} from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";
import { ContextMenu } from "@/components/context-menu";
import { Dialog } from "@/components/dialog";
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSection,
} from "@/components/dialog-layout";
import { LocalTaskRow } from "@/header/recent-tasks-menu/local-task-row";
import { ThreadHoverActions } from "@/header/recent-tasks-menu/thread-hover-actions";
import { useArchiveState } from "@/header/recent-tasks-menu/use-archive-state";
import { usePlatform } from "@/hooks/use-platform";
import ArchiveIcon from "@/icons/archive.svg";
import { getLocalConversationTitle } from "@/local-conversation/get-local-conversation-title";
import {
  threadActionMessages,
  useThreadActions,
} from "@/local-conversation/thread-actions";
import { useForkConversationActions } from "@/local-conversation/use-fork-conversation-actions";
import { useThreadOverlayAction } from "@/local-conversation/use-open-thread-overlay";
import { getOpenInFileManagerMessage } from "@/sidebar/open-in-file-manager-message";
import {
  pinMessageDescriptor,
  setThreadPinned,
  unpinMessageDescriptor,
} from "@/sidebar/pin-indicator";
import { useMutationFromVSCode } from "@/vscode-api";

export function ThreadRowActionsMenu({
  requestArchive,
  confirmArchive,
  confirmingArchive,
  canArchive,
  actionOverride,
}: {
  requestArchive: () => void;
  confirmArchive: () => void;
  confirmingArchive: boolean;
  canArchive: boolean;
  actionOverride?: {
    message: (typeof threadActionMessages)[keyof typeof threadActionMessages];
    icon: ReactElement;
    onClick: () => void;
    requestConfirm: () => void;
    confirming: boolean;
    requiresConfirm: boolean;
  };
}): ReactElement | null {
  const intl = useIntl();
  if (!canArchive) {
    return null;
  }
  const actionMessage =
    actionOverride?.message ?? threadActionMessages.archiveThread;
  const actionIcon = actionOverride?.icon ?? (
    <ArchiveIcon className="icon-xs" />
  );
  const handleActionClick = actionOverride?.onClick ?? requestArchive;
  const handleConfirmClick = actionOverride?.requestConfirm ?? confirmArchive;
  const isConfirmingAction = actionOverride?.confirming ?? confirmingArchive;
  const requiresConfirm = actionOverride?.requiresConfirm ?? true;

  return (
    <ThreadHoverActions
      actions={[
        {
          id: "thread-primary-action",
          ariaLabel: intl.formatMessage(actionMessage),
          icon: actionIcon,
          onClick: handleActionClick,
        },
      ]}
      confirmAction={
        requiresConfirm
          ? {
              active: isConfirmingAction,
              ariaLabel: intl.formatMessage({
                id: "codex.taskRowLayout.confirm",
                defaultMessage: "Confirm",
                description: "Confirmation button for archiving a task",
              }),
              label: (
                <FormattedMessage
                  id="codex.taskRowLayout.confirm"
                  defaultMessage="Confirm"
                  description="Confirmation button for archiving a task"
                />
              ),
              onConfirm: handleConfirmClick,
            }
          : undefined
      }
      className={clsx(
        "absolute right-0 top-0 z-10 h-full justify-center mr-px pr-0.5",
        isConfirmingAction && "opacity-100",
      )}
      tooltipSide="right"
    />
  );
}

export function LocalTaskRowWithMenu({
  conversation,
  isPinned = false,
  canPin = true,
  onStartNewThread,
  onArchiveStart,
  onArchiveSuccess,
  onArchiveError,
  ...rest
}: ComponentProps<typeof LocalTaskRow> & {
  isPinned?: boolean;
  canPin?: boolean;
  onStartNewThread?: () => void;
}): ReactElement | null {
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const intl = useIntl();
  const {
    archiveThread,
    markThreadAsUnread,
    renameThread,
    copyWorkingDirectory,
    copySessionId,
    copyAppLink,
  } = useThreadActions();
  const { platform } = usePlatform();
  const openFile = useMutationFromVSCode("open-file");
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
  const {
    hideMeta,
    isActive,
    onDoubleClick: onRowDoubleClick,
    ...restProps
  } = rest;
  const {
    forkIntoLocal,
    forkIntoWorktree,
    isResponseInProgress,
    canForkIntoWorktree,
  } = useForkConversationActions({
    sourceConversationId: conversation.id,
    sourceWorkspaceRoot: conversation.cwd ?? null,
  });
  const { canOpenThreadOverlay, openThreadOverlay } = useThreadOverlayAction({
    conversationId: conversation.id,
  });
  const handleArchive = (): void => {
    beginArchive();
    archiveThread({
      conversationId: conversation.id,
      onArchiveSuccess: () => {
        handleArchiveSuccess();
        if (isActive) {
          onStartNewThread?.();
        }
      },
      onArchiveError: handleArchiveError,
    });
  };
  if (archived && !usesExternalArchiveHandling) {
    return null;
  }

  const handleRename = (): void => {
    const currentTitle = getLocalConversationTitle(conversation) ?? "";
    setDraftTitle(currentTitle);
    setIsRenaming(true);
  };
  const handleOpenThreadFolder = (): void => {
    if (!conversation.cwd) {
      return;
    }
    openFile.mutate({
      path: conversation.cwd,
      cwd: createGitCwd(conversation.cwd),
      target: "fileManager",
    });
  };
  const handleRowDoubleClick = (event: MouseEvent<HTMLDivElement>): void => {
    onRowDoubleClick?.(event);
    if (event.defaultPrevented) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (!target?.closest("[data-thread-title]")) {
      return;
    }
    handleRename();
  };
  const handleRenameSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    renameThread({
      conversationId: conversation.id,
      title: draftTitle,
    });
    setIsRenaming(false);
  };

  return (
    <>
      <ContextMenu
        items={[
          ...(canPin
            ? [
                isPinned
                  ? {
                      id: "unpin-thread",
                      message: unpinMessageDescriptor,
                      onSelect: () => setThreadPinned(conversation.id, false),
                    }
                  : {
                      id: "pin-thread",
                      message: pinMessageDescriptor,
                      onSelect: () => setThreadPinned(conversation.id, true),
                    },
              ]
            : []),
          {
            id: "rename-thread",
            message: threadActionMessages.renameThread,
            onSelect: handleRename,
          },
          {
            id: "archive-thread",
            message: threadActionMessages.archiveThread,
            onSelect: handleArchive,
          },
          {
            id: "mark-thread-unread",
            message: threadActionMessages.markThreadUnread,
            enabled: !conversation.hasUnreadTurn,
            onSelect: (): void => {
              markThreadAsUnread({ conversationId: conversation.id });
            },
          },
          {
            id: "thread-actions-separator",
            type: "separator",
          },
          {
            id: "open-thread-folder",
            message: getOpenInFileManagerMessage(platform),
            enabled: !!conversation.cwd,
            onSelect: handleOpenThreadFolder,
          },
          {
            id: "copy-cwd",
            message: threadActionMessages.copyWorkingDirectory,
            enabled: !!conversation.cwd,
            onSelect: () => copyWorkingDirectory(conversation.cwd ?? null),
          },
          {
            id: "copy-session-id",
            message: threadActionMessages.copySessionId,
            onSelect: () => copySessionId(conversation.id),
          },
          {
            id: "copy-app-link",
            message: threadActionMessages.copyAppLink,
            onSelect: () => copyAppLink(conversation.id),
          },
          {
            id: "fork-actions-separator",
            type: "separator",
          },
          {
            id: "fork-into-local",
            message: threadActionMessages.forkIntoLocal,
            enabled: !isResponseInProgress,
            onSelect: (): void => {
              void forkIntoLocal();
            },
          },
          {
            id: "fork-into-worktree",
            message: threadActionMessages.forkIntoWorktree,
            enabled: !isResponseInProgress && canForkIntoWorktree,
            onSelect: (): void => {
              void forkIntoWorktree();
            },
          },
          ...(canOpenThreadOverlay
            ? [
                {
                  id: "mini-window-separator",
                  type: "separator" as const,
                },
                {
                  id: "open-thread-mini-window",
                  message: threadActionMessages.openInMiniWindow,
                  onSelect: openThreadOverlay,
                },
              ]
            : []),
        ]}
      >
        <LocalTaskRow
          conversation={conversation}
          isActive={isActive}
          renderActions={({
            requestArchive,
            confirmArchive,
            confirmingArchive,
            canArchive,
          }) => (
            <ThreadRowActionsMenu
              requestArchive={requestArchive}
              confirmArchive={confirmArchive}
              confirmingArchive={confirmingArchive}
              canArchive={canArchive}
            />
          )}
          hideMeta={!!hideMeta}
          onArchiveStart={onArchiveStart}
          onArchiveSuccess={onArchiveSuccess}
          onArchiveError={onArchiveError}
          onDoubleClick={handleRowDoubleClick}
          {...restProps}
        />
      </ContextMenu>
      <Dialog
        open={isRenaming}
        onOpenChange={(open) => {
          setIsRenaming(open);
          if (!open) {
            setDraftTitle("");
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
                value={draftTitle}
                onChange={(event) => {
                  setDraftTitle(event.target.value);
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
                  onClick={() => setIsRenaming(false)}
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
