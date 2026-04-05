import type { ConversationId } from "protocol";
import { useState, type FormEvent, type ReactElement } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { Button } from "@/components/button";
import { Dialog } from "@/components/dialog";
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSection,
} from "@/components/dialog-layout";
import { BasicDropdown, Dropdown } from "@/components/dropdown";
import ArchiveIcon from "@/icons/archive.svg";
import ClipboardIcon from "@/icons/clipboard.svg";
import CopyIcon from "@/icons/copy.svg";
import EditIcon from "@/icons/edit.svg";
import MacbookIcon from "@/icons/macbook.svg";
import PinFilledIcon from "@/icons/pin-filled.svg";
import PinIcon from "@/icons/pin.svg";
import PopInMacIcon from "@/icons/pop-in-mac.svg";
import ThreeDotsIcon from "@/icons/three-dots.svg";
import WorktreeIcon from "@/icons/worktree.svg";
import { getMenuShortcutLabel } from "@/keyboard-shortcuts/electron-menu-shortcuts";
import {
  copySessionId,
  copyWorkingDirectory,
  threadActionMessages,
  usePinnedThread,
  useThreadActions,
} from "@/local-conversation/thread-actions";
import { useMessage } from "@/message-bus";
import {
  pinMessageDescriptor,
  unpinMessageDescriptor,
} from "@/sidebar/pin-indicator";

import { ArchiveThreadConfirmDialog } from "./archive-thread-confirm-dialog";
import { useForkConversationActions } from "./use-fork-conversation-actions";
import { useThreadOverlayAction } from "./use-open-thread-overlay";

export function ThreadOverflowMenu({
  conversationId,
  cwd,
  title,
  canPin = true,
  onArchiveSuccess,
}: {
  conversationId: ConversationId | null;
  cwd: string | null;
  title: string | null;
  canPin?: boolean;
  onArchiveSuccess?: () => void;
}): ReactElement | null {
  const intl = useIntl();
  const { archiveThread, renameThread, copyAppLink } = useThreadActions();
  const [isRenaming, setIsRenaming] = useState(false);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const { isPinned, togglePin } = usePinnedThread(conversationId, { canPin });
  const toggleThreadPinShortcut = canPin
    ? getMenuShortcutLabel("toggleThreadPin")
    : null;
  const renameThreadShortcut = getMenuShortcutLabel("renameThread");
  const archiveThreadShortcut = getMenuShortcutLabel("archiveThread");
  const copyWorkingDirectoryShortcut = getMenuShortcutLabel(
    "copyWorkingDirectory",
  );
  const copySessionIdShortcut = getMenuShortcutLabel("copySessionId");
  const copyDeeplinkShortcut = getMenuShortcutLabel("copyDeeplink");
  const { canOpenThreadOverlay, openThreadOverlay } = useThreadOverlayAction({
    conversationId,
  });

  useMessage(
    "toggle-thread-pin",
    () => {
      if (!canPin) {
        return;
      }
      togglePin();
    },
    [canPin, togglePin],
  );
  useMessage(
    "rename-thread",
    () => {
      if (!conversationId) {
        return;
      }
      setDraftTitle(title ?? "");
      setIsRenaming(true);
    },
    [conversationId, title],
  );
  useMessage(
    "archive-thread",
    () => {
      setIsArchiveConfirmOpen(true);
    },
    [],
  );
  useMessage(
    "copy-conversation-path",
    () => {
      copyWorkingDirectory(cwd);
    },
    [cwd],
  );
  useMessage(
    "copy-working-directory",
    () => {
      copyWorkingDirectory(cwd);
    },
    [cwd],
  );
  useMessage(
    "copy-session-id",
    () => {
      if (!conversationId) {
        return;
      }
      copySessionId(conversationId);
    },
    [conversationId],
  );
  useMessage(
    "copy-deeplink",
    () => {
      if (!conversationId) {
        return;
      }
      copyAppLink(conversationId);
    },
    [conversationId],
  );
  const {
    forkIntoLocal,
    forkIntoWorktree,
    isResponseInProgress,
    canForkIntoWorktree,
  } = useForkConversationActions({
    sourceConversationId: conversationId,
    sourceWorkspaceRoot: cwd,
  });

  if (!conversationId) {
    return null;
  }

  const handleRenameOpen = (): void => {
    setDraftTitle(title ?? "");
    setIsRenaming(true);
  };

  const handleRenameSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    renameThread({
      conversationId,
      title: draftTitle,
    });
    setIsRenaming(false);
  };

  const handleArchiveConfirm = (): void => {
    archiveThread({
      conversationId,
      onArchiveSuccess,
    });
    setIsArchiveConfirmOpen(false);
  };
  const pinLabel = isPinned ? unpinMessageDescriptor : pinMessageDescriptor;
  const pinIcon = isPinned ? PinFilledIcon : PinIcon;
  const moreLabel = intl.formatMessage(threadActionMessages.moreActions);

  return (
    <>
      <BasicDropdown
        triggerButton={
          <Button
            size="icon"
            color="ghost"
            className="no-drag"
            aria-label={moreLabel}
          >
            <ThreeDotsIcon className="icon-sm" />
          </Button>
        }
        align="start"
        contentWidth="menu"
      >
        {canPin ? (
          <Dropdown.Item
            onSelect={togglePin}
            LeftIcon={pinIcon}
            keyboardShortcut={toggleThreadPinShortcut}
          >
            <FormattedMessage {...pinLabel} />
          </Dropdown.Item>
        ) : null}
        <Dropdown.Item
          onSelect={handleRenameOpen}
          LeftIcon={EditIcon}
          keyboardShortcut={renameThreadShortcut}
        >
          <FormattedMessage {...threadActionMessages.renameThread} />
        </Dropdown.Item>
        <Dropdown.Item
          onSelect={() => setIsArchiveConfirmOpen(true)}
          LeftIcon={ArchiveIcon}
          keyboardShortcut={archiveThreadShortcut}
        >
          <FormattedMessage {...threadActionMessages.archiveThread} />
        </Dropdown.Item>
        <Dropdown.Separator />
        <Dropdown.Item
          onSelect={() => copyWorkingDirectory(cwd)}
          LeftIcon={ClipboardIcon}
          keyboardShortcut={copyWorkingDirectoryShortcut}
          disabled={!cwd}
        >
          <FormattedMessage {...threadActionMessages.copyWorkingDirectory} />
        </Dropdown.Item>
        <Dropdown.Item
          onSelect={() => copySessionId(conversationId)}
          LeftIcon={CopyIcon}
          keyboardShortcut={copySessionIdShortcut}
        >
          <FormattedMessage {...threadActionMessages.copySessionId} />
        </Dropdown.Item>
        <Dropdown.Item
          onSelect={() => copyAppLink(conversationId)}
          LeftIcon={ClipboardIcon}
          keyboardShortcut={copyDeeplinkShortcut}
        >
          <FormattedMessage {...threadActionMessages.copyAppLink} />
        </Dropdown.Item>
        <Dropdown.Separator />
        <Dropdown.Item
          onSelect={() => {
            void forkIntoLocal();
          }}
          LeftIcon={MacbookIcon}
          disabled={isResponseInProgress}
        >
          <FormattedMessage {...threadActionMessages.forkIntoLocal} />
        </Dropdown.Item>
        <Dropdown.Item
          onSelect={() => {
            void forkIntoWorktree();
          }}
          LeftIcon={WorktreeIcon}
          disabled={isResponseInProgress || !canForkIntoWorktree}
        >
          <FormattedMessage {...threadActionMessages.forkIntoWorktree} />
        </Dropdown.Item>
        {canOpenThreadOverlay ? (
          <>
            <Dropdown.Separator />
            <Dropdown.Item onSelect={openThreadOverlay} LeftIcon={PopInMacIcon}>
              <FormattedMessage {...threadActionMessages.openInMiniWindow} />
            </Dropdown.Item>
          </>
        ) : null}
      </BasicDropdown>

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
                onFocus={(event) => {
                  event.currentTarget.select();
                }}
                placeholder={intl.formatMessage(
                  threadActionMessages.renameDialogPlaceholder,
                )}
                aria-label={intl.formatMessage(
                  threadActionMessages.renameDialogAriaLabel,
                )}
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

      <ArchiveThreadConfirmDialog
        open={isArchiveConfirmOpen}
        onOpenChange={setIsArchiveConfirmOpen}
        onConfirm={handleArchiveConfirm}
      />
    </>
  );
}
