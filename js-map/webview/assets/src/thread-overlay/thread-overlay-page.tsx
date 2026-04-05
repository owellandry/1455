import { createGitCwd, type ConversationId } from "protocol";
import { useState } from "react";
import { defineMessages, FormattedMessage, useIntl } from "react-intl";
import { useParams } from "react-router";

import { useLocalConversationSelector } from "@/app-server/app-server-manager-hooks";
import { Button } from "@/components/button";
import { Tooltip } from "@/components/tooltip";
import { MiniWindowPageHeader } from "@/hotkey-window/hotkey-window-page-header";
import BrowserHistoryIcon from "@/icons/browser-history.svg";
import { getLocalConversationTitle } from "@/local-conversation/get-local-conversation-title";
import { LocalConversationRouteScopeProviders } from "@/local-conversation/local-conversation-route-scope-providers";
import { LocalConversationThread } from "@/local-conversation/local-conversation-thread";
import { messageBus } from "@/message-bus";
import { getProjectName } from "@/thread-layout/get-project-name";

const messages = defineMessages({
  fallbackTitle: {
    id: "threadOverlay.defaultTitle",
    defaultMessage: "Codex",
    description: "Fallback title for thread overlay header",
  },
});

export function ThreadOverlayPage(): React.ReactElement {
  const intl = useIntl();
  const { conversationId } = useParams<{ conversationId: ConversationId }>();
  const title = useLocalConversationSelector(
    conversationId ?? null,
    (conversation) => getLocalConversationTitle(conversation),
  );
  const conversationCwd = useLocalConversationSelector(
    conversationId ?? null,
    (conversation) => conversation?.cwd ?? null,
  );
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
  const repoPath = conversationCwd ? createGitCwd(conversationCwd) : null;
  const projectName = getProjectName(repoPath);
  const fallbackTitle = intl.formatMessage(messages.fallbackTitle);

  if (!conversationId) {
    return <div className="h-full" />;
  }

  const handleToggleAlwaysOnTop = (): void => {
    setIsAlwaysOnTop((prev) => {
      const next = !prev;
      messageBus.dispatchMessage("thread-overlay-set-always-on-top", {
        shouldFloat: next,
      });
      return next;
    });
  };

  const toggleAlwaysOnTopLabel = {
    id: "threadOverlay.toolbar.toggleAlwaysOnTop",
    defaultMessage: "Toggle always on top",
    description: "Button label for toggling always-on-top in thread overlay",
  };
  const overlayTitle = title ?? fallbackTitle;

  return (
    <LocalConversationRouteScopeProviders conversationId={conversationId}>
      <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-token-border-light bg-token-bg-primary">
        <MiniWindowPageHeader
          reserveWindowControlsSafeArea
          showDismissButton={false}
          title={
            <div className="flex max-w-full min-w-0 items-baseline gap-2">
              <div className="min-w-0 shrink-[999] truncate text-token-foreground">
                {overlayTitle}
              </div>
              {projectName != null ? (
                <div className="flex shrink-0 items-center gap-1 whitespace-nowrap text-token-description-foreground">
                  <span className="truncate">{projectName}</span>
                </div>
              ) : null}
            </div>
          }
          rightActions={
            <Tooltip
              tooltipContent={<FormattedMessage {...toggleAlwaysOnTopLabel} />}
              delayOpen
            >
              <Button
                size="toolbar"
                color={isAlwaysOnTop ? "secondary" : "ghost"}
                uniform
                aria-label={intl.formatMessage(toggleAlwaysOnTopLabel)}
                onClick={handleToggleAlwaysOnTop}
              >
                <BrowserHistoryIcon className="icon-sm" />
              </Button>
            </Tooltip>
          }
        />
        <div className="min-h-0 flex-1">
          <LocalConversationThread
            header={null}
            className="h-full [--padding-panel:calc(var(--padding-panel-base)/2)]"
            conversationId={conversationId}
            allowMissingConversation
            showExternalFooter
          />
        </div>
      </div>
    </LocalConversationRouteScopeProviders>
  );
}
