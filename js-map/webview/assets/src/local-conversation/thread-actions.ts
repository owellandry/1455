import { useScope } from "maitai";
import type { ConversationId } from "protocol";
import { defineMessages, useIntl, type IntlShape } from "react-intl";

import type { AppServerManager } from "@/app-server/app-server-manager";
import { useAppServerRegistry } from "@/app-server/app-server-manager-hooks";
import { toast$ } from "@/components/toaster/toast-signal";
import { AppScope, type AppScopeHandle } from "@/scopes/app-scope";
import { setThreadPinned } from "@/sidebar/pin-indicator";
import { copyToClipboard } from "@/utils/copy-to-clipboard";
import { useFetchFromVSCode } from "@/vscode-api";

export const threadActionMessages = defineMessages({
  archiveThreadError: {
    id: "sidebarElectron.archiveThreadError",
    defaultMessage: "Failed to archive thread",
    description: "Error message when archiving a local thread",
  },
  interruptThreadError: {
    id: "sidebarElectron.interruptThreadError",
    defaultMessage: "Failed to stop thread",
    description: "Error message when stopping an in-progress local thread",
  },
  renameThreadError: {
    id: "sidebarElectron.renameThreadError",
    defaultMessage: "Failed to rename thread",
    description: "Error message when renaming a local thread",
  },
  copyWorkingDirectory: {
    id: "threadHeader.copyWorkingDirectory",
    defaultMessage: "Copy working directory",
    description: "Menu item to copy the current working directory",
  },
  copySessionId: {
    id: "threadHeader.copySessionId",
    defaultMessage: "Copy session ID",
    description: "Menu item to copy the current session ID",
  },
  copyAppLink: {
    id: "threadHeader.copyAppLink",
    defaultMessage: "Copy deeplink",
    description: "Menu item to copy a deeplink to this thread",
  },
  openInMiniWindow: {
    id: "threadHeader.openInMiniWindow",
    defaultMessage: "Open in mini window",
    description: "Menu item to open the current thread in a mini window",
  },
  moreActions: {
    id: "threadHeader.moreActions",
    defaultMessage: "Thread actions",
    description: "Aria label for thread actions dropdown",
  },
  renameThread: {
    id: "sidebarElectron.renameThread",
    defaultMessage: "Rename thread",
    description: "Menu item to rename a local thread",
  },
  archiveThread: {
    id: "sidebarElectron.archiveThread",
    defaultMessage: "Archive thread",
    description: "Menu item to archive a local thread",
  },
  markThreadUnread: {
    id: "sidebarElectron.markThreadUnread",
    defaultMessage: "Mark as unread",
    description: "Menu item to mark a local thread as unread",
  },
  forkIntoLocal: {
    id: "threadHeader.forkIntoLocal",
    defaultMessage: "Fork into local",
    description: "Menu item to fork a local thread into the current workspace",
  },
  forkIntoWorktree: {
    id: "threadHeader.forkIntoWorktree",
    defaultMessage: "Fork into new worktree",
    description: "Menu item to fork a local thread into a new worktree",
  },
  forkThreadError: {
    id: "threadHeader.forkThreadError",
    defaultMessage: "Failed to fork thread",
    description: "Error message shown when forking a local thread fails",
  },
  forkThreadRequiresGitRepo: {
    id: "threadHeader.forkThreadRequiresGitRepo",
    defaultMessage: "Fork into new worktree requires a git repository",
    description:
      "Error message shown when trying to fork into a worktree outside a git repository",
  },
  forkPendingWorktreeTitle: {
    id: "threadHeader.forkPendingWorktreeTitle",
    defaultMessage: "Forked conversation",
    description:
      "Default pending worktree label when forking a conversation from a thread menu",
  },
  forkPendingWorktreePrompt: {
    id: "threadHeader.forkPendingWorktreePrompt",
    defaultMessage: "Fork this conversation into a new worktree.",
    description:
      "Prompt text shown on the worktree init page for thread-menu fork actions",
  },
  renameDialogTitle: {
    id: "sidebarElectron.renameThreadDialogTitle",
    defaultMessage: "Rename thread",
    description: "Title for rename thread dialog",
  },
  renameDialogSubtitle: {
    id: "sidebarElectron.renameThreadDialogSubtitle",
    defaultMessage: "Keep it short and recognizable.",
    description: "Subtitle for rename thread dialog",
  },
  renameDialogPlaceholder: {
    id: "sidebarElectron.renameThreadDialogPlaceholder",
    defaultMessage: "Add a title…",
    description: "Placeholder for rename thread input",
  },
  renameDialogAriaLabel: {
    id: "sidebarElectron.renameThreadDialogAriaLabel",
    defaultMessage: "Thread title",
    description: "Aria label for rename thread input",
  },
  renameDialogCancel: {
    id: "sidebarElectron.renameThreadDialogCancel",
    defaultMessage: "Cancel",
    description: "Cancel button label for rename thread dialog",
  },
  renameDialogSave: {
    id: "sidebarElectron.renameThreadDialogSave",
    defaultMessage: "Save",
    description: "Save button label for rename thread dialog",
  },
});

export function usePinnedThread(
  conversationId: ConversationId | string | null,
  { canPin = true }: { canPin?: boolean } = {},
): {
  isPinned: boolean;
  togglePin: () => void;
} {
  const { data: pinnedThreadsResponse } = useFetchFromVSCode(
    "list-pinned-threads",
    {
      placeholderData: { threadIds: [] },
    },
  );
  const pinnedIds = pinnedThreadsResponse?.threadIds ?? [];
  const isPinned =
    canPin && conversationId != null && pinnedIds.includes(conversationId);

  const togglePin = (): void => {
    if (!canPin || conversationId == null) {
      return;
    }
    void setThreadPinned(conversationId, !isPinned);
  };

  return { isPinned, togglePin };
}

export function copyWorkingDirectory(cwd: string | null | undefined): void {
  if (!cwd) {
    return;
  }
  void copyToClipboard(cwd);
}

export function copySessionId(
  conversationId: ConversationId | string | null,
): void {
  if (!conversationId) {
    return;
  }
  void copyToClipboard(conversationId);
}

export function copyAppLink(
  conversationId: ConversationId | string | null,
): void {
  if (!conversationId) {
    return;
  }
  void copyToClipboard(`codex://threads/${conversationId}`);
}

function archiveThread({
  conversationId,
  mcpManager,
  intl,
  scope,
  onArchiveSuccess,
  onArchiveError,
}: {
  conversationId: ConversationId;
  mcpManager: AppServerManager;
  intl: IntlShape;
  scope: AppScopeHandle;
  onArchiveSuccess?: () => void;
  onArchiveError?: () => void;
}): void {
  void mcpManager
    .archiveConversation(conversationId)
    .then(() => {
      onArchiveSuccess?.();
    })
    .catch(() => {
      onArchiveError?.();
      scope
        .get(toast$)
        .danger(intl.formatMessage(threadActionMessages.archiveThreadError));
    });
}

function renameThread({
  conversationId,
  title,
  mcpManager,
  intl,
  scope,
}: {
  conversationId: ConversationId;
  title: string;
  mcpManager: AppServerManager;
  intl: IntlShape;
  scope: AppScopeHandle;
}): void {
  void mcpManager.renameConversationTitle(conversationId, title).catch(() => {
    scope
      .get(toast$)
      .danger(intl.formatMessage(threadActionMessages.renameThreadError));
  });
}

export function useThreadActions(): {
  archiveThread: (options: {
    conversationId: ConversationId;
    onArchiveSuccess?: () => void;
    onArchiveError?: () => void;
  }) => void;
  interruptThread: (options: { conversationId: ConversationId }) => void;
  markThreadAsUnread: (options: { conversationId: ConversationId }) => void;
  renameThread: (options: {
    conversationId: ConversationId;
    title: string;
  }) => void;
  copyWorkingDirectory: typeof copyWorkingDirectory;
  copySessionId: typeof copySessionId;
  copyAppLink: typeof copyAppLink;
} {
  const appServerRegistry = useAppServerRegistry();
  const intl = useIntl();
  const scope = useScope(AppScope);
  const getMcpManager = (conversationId: ConversationId): AppServerManager =>
    appServerRegistry.getMaybeForConversationId(conversationId) ??
    appServerRegistry.getDefault();

  return {
    archiveThread: (options) =>
      archiveThread({
        ...options,
        mcpManager: getMcpManager(options.conversationId),
        intl,
        scope,
      }),
    interruptThread: ({ conversationId }): void => {
      void getMcpManager(conversationId)
        .interruptConversation(conversationId)
        .catch(() => {
          scope
            .get(toast$)
            .danger(
              intl.formatMessage(threadActionMessages.interruptThreadError),
            );
        });
    },
    markThreadAsUnread: ({ conversationId }): void => {
      getMcpManager(conversationId).markConversationAsUnread(conversationId);
    },
    renameThread: (options) =>
      renameThread({
        ...options,
        mcpManager: getMcpManager(options.conversationId),
        intl,
        scope,
      }),
    copyWorkingDirectory,
    copySessionId,
    copyAppLink,
  };
}
