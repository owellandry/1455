import clsx from "clsx";
import { createConversationId, type ConversationId } from "protocol";
import type { ReactElement, ReactNode } from "react";
import { FormattedMessage, defineMessage, useIntl } from "react-intl";
import { useLocation, useMatch } from "react-router";

import {
  useConversations,
  useLocalConversationSelector,
} from "@/app-server/app-server-manager-hooks";
import { getSubagentSourceMetadata } from "@/app-server/utils/get-subagent-source-metadata";
import { useTaskDetails, useTasks } from "@/codex-api";
import { AppHeader } from "@/components/app/app-header";
import { Button } from "@/components/button";
import { Tooltip } from "@/components/tooltip";
import { WithWindow } from "@/components/with-window";
import { useStartNewConversation } from "@/hooks/use-start-new-conversation";
import ArrowLeftIcon from "@/icons/arrow-left.svg";
import { initialRoute } from "@/initial-route-atom";
import {
  getLocalConversationTitle,
  getSubagentTitleFromParentConversation,
} from "@/local-conversation/get-local-conversation-title";
import { ProfileDropdown } from "@/sign-in/profile-dropdown";

import { NewChatButton } from "./new-chat-button";
import { RecentTasksInline } from "./recent-tasks-inline";
import { RecentTasksMenuTrigger } from "./recent-tasks-menu/recent-tasks-menu-trigger";
import {
  useMergedTasks,
  type MergedTask,
} from "./recent-tasks-menu/use-merge-tasks";

/**
 * Top chrome for the home + thread routes.
 */
export function Header({
  className,
  title,
  onBack,
  trailing,
}: {
  className?: string;
  title?: string | ReactElement | null | undefined;
  onBack?: (() => void) | undefined;
  trailing?: ReactNode;
}): ReactElement {
  const location = useLocation();
  const startNewChat = useStartNewConversation();
  const handleStartNewChat =
    onBack ??
    ((): void => {
      startNewChat();
    });
  const isHome = location.pathname === "/";
  const openRecentTasksMenu = (): void => {
    window.dispatchEvent(new CustomEvent("open-recent-tasks-menu"));
  };

  const { data: conversations } = useConversations();
  const tasksQuery = useTasks({
    taskFilter: "current",
    limit: 20,
    enabled: isHome,
  });
  const mergedTasks = useMergedTasks(
    tasksQuery.data,
    conversations ?? [],
    null,
  );
  const shouldShowBackButton = initialRoute == null;

  return (
    // AppHeader portals this chrome into the shared shell toolbar.
    <AppHeader>
      <div className={clsx("draggable extension:px-panel", className)}>
        <div className="flex items-center justify-between electron:h-toolbar browser:h-toolbar extension:py-row-y">
          <div
            className="mr-3 line-clamp-1 flex min-w-0 flex-1 items-center gap-1 truncate"
            style={{ viewTransitionName: "header-title" }}
          >
            {title ? (
              <div className="flex min-w-0 items-center gap-1">
                {shouldShowBackButton ? (
                  <BackButton onClick={handleStartNewChat} />
                ) : null}
                <Button
                  color="ghostActive"
                  type="button"
                  onClick={openRecentTasksMenu}
                  className="min-w-0 flex-1 truncate !px-0 !py-0 text-left text-sm text-token-foreground hover:!bg-transparent hover:opacity-80 electron:font-medium"
                >
                  <span className="truncate">{title}</span>
                </Button>
              </div>
            ) : (
              <span className="text-token-description-foreground">
                <RecentTasksHeaderLabel
                  mergedTasks={mergedTasks}
                  onBack={handleStartNewChat}
                  showBackButton={shouldShowBackButton}
                />
              </span>
            )}
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            {trailing}
            <WithWindow extension>
              <div className="mr-1 flex flex-shrink-0 items-center">
                <div className="flex items-center gap-1">
                  <RecentTasksMenuTrigger />
                  <ProfileDropdown />
                  <NewChatButton />
                </div>
              </div>
            </WithWindow>
          </div>
        </div>

        <WithWindow extension>
          {isHome && (
            <div>
              <RecentTasksInline
                tasksQuery={tasksQuery}
                mergedTasks={mergedTasks}
              />
            </div>
          )}
        </WithWindow>
      </div>
    </AppHeader>
  );
}

function RecentTasksHeaderLabel({
  mergedTasks,
  onBack,
  showBackButton,
}: {
  mergedTasks: Array<MergedTask>;
  onBack: () => void;
  showBackButton: boolean;
}): React.ReactElement | null {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const localConversationId = (useMatch("/local/:conversationId")?.params
    ?.conversationId ?? null) as ConversationId | null;

  const remoteTaskId = useMatch("/remote/:taskId")?.params?.taskId ?? null;
  const { data: taskDetails } = useTaskDetails(remoteTaskId);

  const conversationTitle = useLocalConversationSelector(
    localConversationId,
    (conversation) => getLocalConversationTitle(conversation),
  );
  const hasLocalConversation = useLocalConversationSelector(
    localConversationId,
    (conversation) => conversation != null,
  );
  const subagentParentThreadId = useLocalConversationSelector(
    localConversationId,
    (conversation) =>
      getSubagentSourceMetadata(conversation?.source)?.parentThreadId,
  );
  const subagentTitleFromParent = useLocalConversationSelector(
    subagentParentThreadId != null
      ? createConversationId(subagentParentThreadId)
      : null,
    (parentConversation) =>
      localConversationId != null
        ? getSubagentTitleFromParentConversation(
            localConversationId,
            parentConversation,
          )
        : null,
  );

  if (remoteTaskId && taskDetails?.task?.title) {
    return (
      <div className="flex min-w-0 items-center gap-1">
        {showBackButton ? <BackButton onClick={onBack} /> : null}
        <span className="min-w-0 flex-1 text-base text-token-foreground">
          {taskDetails.task.title}
        </span>
      </div>
    );
  }

  if (localConversationId && hasLocalConversation) {
    const title = conversationTitle ?? subagentTitleFromParent;
    return (
      <div className="flex min-w-0 items-center gap-1">
        {showBackButton ? <BackButton onClick={onBack} /> : null}
        <span className="min-w-0 flex-1 text-base text-token-foreground">
          {title || (
            <FormattedMessage
              id="codex.taskRow.title"
              defaultMessage="New thread"
              description="Default title for a Codex thread that doesn't have a title"
            />
          )}
        </span>
      </div>
    );
  }

  if (isHome) {
    if (mergedTasks.length === 0) {
      return null;
    }
    return (
      <FormattedMessage
        id="header.recentChats"
        defaultMessage="Tasks"
        description="Header label for recent tasks"
      />
    );
  }

  return null;
}

const backButtonMessage = defineMessage({
  id: "header.back",
  defaultMessage: "Back",
  description: "Back button label for returning to the previous screen",
});

function BackButton({ onClick }: { onClick: () => void }): ReactElement | null {
  const intl = useIntl();
  return (
    <WithWindow extension>
      <Tooltip tooltipContent={<FormattedMessage {...backButtonMessage} />}>
        <Button
          color="ghost"
          size="icon"
          onClick={onClick}
          className="opacity-70 hover:bg-transparent hover:opacity-100 focus:bg-transparent active:bg-transparent"
          aria-label={intl.formatMessage(backButtonMessage)}
        >
          <ArrowLeftIcon className="size-3" />
        </Button>
      </Tooltip>
    </WithWindow>
  );
}
