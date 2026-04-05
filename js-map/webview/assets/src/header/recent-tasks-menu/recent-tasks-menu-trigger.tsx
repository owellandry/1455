import type React from "react";
import { useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useMatch } from "react-router";

import { useConversations } from "@/app-server/app-server-manager-hooks";
import { isLocalConversationInProgress } from "@/app-server/utils/is-local-conversation-in-progress";
import { useAuth } from "@/auth/use-auth";
import { useTasks } from "@/codex-api";
import { Button } from "@/components/button";
import { BasicDropdown } from "@/components/dropdown";
import { Spinner } from "@/components/spinner";
import { Tooltip } from "@/components/tooltip";
import { useIsBackgroundSubagentsEnabled } from "@/hooks/use-is-background-subagents-enabled";
import { useWindowType } from "@/hooks/use-window-type";
import History from "@/icons/history.svg";

import { RecentTasksMenu } from "./recent-tasks-menu";
import { shouldShowConversationInRegularRecentTasks } from "./should-show-conversation-in-regular-recent-tasks";

export function RecentTasksMenuTrigger(): React.ReactElement | null {
  const intl = useIntl();
  const { authMethod } = useAuth();
  const { data: conversations } = useConversations();
  const isBackgroundSubagentsEnabled = useIsBackgroundSubagentsEnabled();
  const windowType = useWindowType();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const recentRemoteTasksQuery = useTasks({
    taskFilter: "current",
    limit: 20,
    enabled: isDropdownOpen && authMethod === "chatgpt",
  });

  const remoteInProgress = (recentRemoteTasksQuery.data ?? []).filter((t) => {
    const status =
      t.task_status_display?.latest_turn_status_display?.turn_status;
    return status === "in_progress" || status === "pending";
  });
  const visibleLocalConversations = (conversations ?? []).filter(
    (conversation) =>
      shouldShowConversationInRegularRecentTasks({
        conversation,
        isBackgroundSubagentsEnabled,
        windowType,
      }),
  );
  const localInProgress = visibleLocalConversations.filter((conversation) =>
    isLocalConversationInProgress(conversation),
  );
  const inProgressCount = remoteInProgress.length + localInProgress.length;
  const localMatch = useMatch("/local/:conversationId");
  const remoteMatch = useMatch("/remote/:taskId");
  const currentIsInProgress =
    (!!localMatch &&
      localInProgress.some(
        (c) => c.id === localMatch.params?.conversationId,
      )) ||
    (!!remoteMatch &&
      remoteInProgress.some((t) => t.id === remoteMatch.params?.taskId));
  const showSpinner =
    inProgressCount > 0 && !(inProgressCount === 1 && currentIsInProgress);
  useEffect(() => {
    if (isDropdownOpen && authMethod === "chatgpt") {
      void recentRemoteTasksQuery.refetch();
    }
    // oxlint-disable-next-line react/exhaustive-deps
  }, [isDropdownOpen]);

  useEffect((): (() => void) => {
    const onOpen = (_evt: Event): void => setIsDropdownOpen(true);
    window.addEventListener("open-recent-tasks-menu", onOpen);
    return (): void =>
      window.removeEventListener("open-recent-tasks-menu", onOpen);
  }, []);

  return (
    <BasicDropdown
      contentClassName="!pb-0 mt-[9px]"
      triggerButton={
        <Tooltip
          tooltipContent={
            <FormattedMessage
              id="codex.recentTasksMenu.tooltip"
              defaultMessage="Task history"
              description="Tooltip text for recent tasks menu"
            />
          }
        >
          <Button
            color="ghost"
            size="icon"
            aria-label={intl.formatMessage(
              {
                id: "codex.recentTasksMenu.trigger",
                defaultMessage:
                  "Recent tasks. {count, plural, one {# in progress} other {# in progress}}",
                description:
                  "Accessible label for opening the recent tasks menu",
              },
              { count: inProgressCount },
            )}
          >
            {showSpinner ? (
              <span className="relative inline-flex size-4 justify-center">
                <Spinner className="icon-xs" />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                  {inProgressCount}
                </span>
              </span>
            ) : (
              <History className="icon-xs hover:opacity-80" />
            )}
            <span className="sr-only" aria-live="polite" aria-atomic="true">
              {intl.formatMessage(
                {
                  id: "codex.recentTasksMenu.count",
                  defaultMessage:
                    "{count, plural, =0 {No tasks in progress} one {# task in progress} other {# tasks in progress}}",
                  description:
                    "Live region text announcing in-progress task count for recent tasks trigger",
                },
                { count: inProgressCount },
              )}
            </span>
          </Button>
        </Tooltip>
      }
      open={isDropdownOpen}
      onOpenChange={setIsDropdownOpen}
    >
      <RecentTasksMenu
        cloudtasksQuery={recentRemoteTasksQuery}
        localConversations={conversations ?? []}
        onClose={() => setIsDropdownOpen(false)}
        autoFocusSearch={isDropdownOpen}
      />
    </BasicDropdown>
  );
}
