import {
  buildLocalConversationRoute,
  createGitCwd,
  getHotkeyWindowNewConversationRoute,
  type ConversationId,
} from "protocol";
import type React from "react";
import { defineMessages, useIntl } from "react-intl";
import { Navigate, useParams } from "react-router";

import {
  useLocalConversationCwd,
  useLocalConversationSelector,
} from "@/app-server/app-server-manager-hooks";
import { getLocalConversationTitle } from "@/local-conversation/get-local-conversation-title";
import { LocalConversationRouteScopeProviders } from "@/local-conversation/local-conversation-route-scope-providers";
import { LocalConversationThread } from "@/local-conversation/local-conversation-thread";
import { getProjectName } from "@/thread-layout/get-project-name";
import { useFetchFromVSCode } from "@/vscode-api";

import { useHotkeyWindowDetailLayout } from "./use-hotkey-window-detail-layout";

const messages = defineMessages({
  fallbackTitle: {
    id: "hotkeyWindow.defaultTitle",
    defaultMessage: "Codex",
    description: "Fallback title for hotkey window thread header",
  },
});

export function HotkeyWindowThreadPage(): React.ReactElement {
  const intl = useIntl();
  const { conversationId } = useParams<{ conversationId: ConversationId }>();
  const { data: hotkeyWindowState } = useFetchFromVSCode(
    "hotkey-window-hotkey-state",
  );
  const shouldUseHotkeyHomeRoute =
    hotkeyWindowState == null || hotkeyWindowState.configuredHotkey != null;
  const hotkeyWindowHomeRoute = getHotkeyWindowNewConversationRoute(
    shouldUseHotkeyHomeRoute,
  );
  const title = useLocalConversationSelector(
    conversationId ?? null,
    (conversation) => getLocalConversationTitle(conversation),
  );
  const conversationCwd = useLocalConversationCwd(conversationId ?? null);
  const repoPath = conversationCwd ? createGitCwd(conversationCwd) : null;
  const projectName = getProjectName(repoPath);
  const fallbackTitle = intl.formatMessage(messages.fallbackTitle);
  useHotkeyWindowDetailLayout(
    conversationId == null
      ? null
      : {
          title: (
            <div className="flex max-w-full min-w-0 items-baseline gap-2">
              <div className="min-w-0 shrink-[999] truncate text-token-foreground">
                {title ?? fallbackTitle}
              </div>
              {projectName != null ? (
                <div className="flex shrink-0 items-center gap-1 whitespace-nowrap text-token-description-foreground">
                  <span className="truncate">{projectName}</span>
                </div>
              ) : null}
            </div>
          ),
          mainWindowPath: buildLocalConversationRoute(conversationId),
        },
  );

  if (!conversationId) {
    return <Navigate to={hotkeyWindowHomeRoute} replace />;
  }

  return (
    <LocalConversationRouteScopeProviders conversationId={conversationId}>
      <LocalConversationThread
        className="h-full [--padding-panel:calc(var(--padding-panel-base)/2)]"
        header={null}
        conversationId={conversationId}
        allowMissingConversation
        showExternalFooter
      />
    </LocalConversationRouteScopeProviders>
  );
}
