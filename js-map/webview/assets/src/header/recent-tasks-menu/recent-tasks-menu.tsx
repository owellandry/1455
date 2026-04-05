import type { UseQueryResult } from "@tanstack/react-query";
import { useAtom } from "jotai";
import type { TaskListItem } from "protocol";
import type React from "react";
import { useDeferredValue, useState } from "react";
import { FormattedMessage, useIntl, type IntlShape } from "react-intl";
import { useMatch, useNavigate } from "react-router";

import type { AppServerConversationState } from "@/app-server/app-server-manager-types";
import { useAuth } from "@/auth/use-auth";
import { useWorkspaceEnvironments } from "@/codex-api";
import { Button } from "@/components/button";
import { Dropdown } from "@/components/dropdown";
import { Spinner } from "@/components/spinner";
import { useIsBackgroundSubagentsEnabled } from "@/hooks/use-is-background-subagents-enabled";
import { useWindowType } from "@/hooks/use-window-type";
import { getLocalConversationTitle } from "@/local-conversation/get-local-conversation-title";
import { containsQuery } from "@/utils/contain-query";
import { persistedAtom } from "@/utils/persisted-atom";
import {
  usePendingWorktreeActions,
  type PendingWorktree,
} from "@/worktrees-v2/pending-worktree-store";

import { CloudTaskRow } from "./cloud-task-row";
import { LocalTaskRow } from "./local-task-row";
import { aCloudTasksEnvFilterIdAtom } from "./recent-task-menu-atoms";
import { RecentTaskSearch } from "./recent-task-search";
import { RecentTasksMenuEmptyState } from "./recent-tasks-menu-empty-state";
import { RecentTasksMenuEnvironmentsFilterDropdown } from "./recent-tasks-menu-environments-filter-dropdown";
import { RecentsMenuHeader } from "./recents-menu-header";
import { SearchTasksEmptyState } from "./search-tasks-empty-state";
import { shouldShowConversationInRegularRecentTasks } from "./should-show-conversation-in-regular-recent-tasks";
import { useMergedTasks, type MergedTask } from "./use-merge-tasks";
import { WorktreeInitRow } from "./worktree-init-row";

export type FilterState = "recent" | "cloud" | "local";

const aFilterStateAtom = persistedAtom<FilterState>(
  "recent-tasks-filter",
  "recent",
);

export function RecentTasksMenu({
  cloudtasksQuery,
  localConversations,
  onClose,
  autoFocusSearch = false,
}: {
  cloudtasksQuery: UseQueryResult<Array<TaskListItem>, Error>;
  localConversations: Array<AppServerConversationState>;
  onClose: () => void;
  autoFocusSearch?: boolean;
}): React.ReactElement {
  const intl = useIntl();
  const { authMethod } = useAuth();
  const [filter, setFilter] = useAtom(aFilterStateAtom);
  const [envFilterId] = useAtom(aCloudTasksEnvFilterIdAtom);
  const activeLocalConversationId =
    useMatch("/local/:conversationId")?.params?.conversationId ?? null;
  const { data: workspaceEnvs } = useWorkspaceEnvironments();
  const isBackgroundSubagentsEnabled = useIsBackgroundSubagentsEnabled();
  const windowType = useWindowType();
  const envForFilter =
    workspaceEnvs?.find((environment) => environment.id === envFilterId) ??
    null;
  const visibleLocalConversations = localConversations.filter((conversation) =>
    shouldShowConversationInRegularRecentTasks({
      conversation,
      isBackgroundSubagentsEnabled,
      windowType,
    }),
  );
  const mergedTasks = useMergedTasks(
    cloudtasksQuery.data,
    localConversations,
    envForFilter,
  );

  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedQuery = deferredSearchQuery.trim().toLowerCase();
  const hasQuery = normalizedQuery.length > 0;
  const remoteTasks = mergedTasks.filter((task) => task.kind === "remote");
  const filteredRemoteTasks = !hasQuery
    ? remoteTasks
    : remoteTasks.filter(({ task }) =>
        containsQuery(task.title, normalizedQuery),
      );
  const filteredLocalTasks = !hasQuery
    ? visibleLocalConversations
    : visibleLocalConversations.filter((conversation) =>
        containsQuery(getLocalConversationTitle(conversation), normalizedQuery),
      );
  const filteredMergedTasks = !hasQuery
    ? mergedTasks
    : mergedTasks.filter((task) =>
        task.kind === "remote"
          ? containsQuery(task.task.title, normalizedQuery)
          : task.kind === "local"
            ? containsQuery(
                getLocalConversationTitle(task.conversation),
                normalizedQuery,
              )
            : containsQuery(
                getWorktreeTitle(task.pendingWorktree, intl),
                normalizedQuery,
              ),
      );
  return (
    <div className="flex max-h-[300px] w-[calc(var(--radix-popper-available-width)_-_var(--padding-panel))] flex-col gap-1">
      <Dropdown.Section>
        <RecentTaskSearch
          searchQuery={searchQuery}
          onQueryChange={setSearchQuery}
          autoFocus={autoFocusSearch}
        />
      </Dropdown.Section>
      <div className="mx-2 border-t-[0.5px] border-token-border" aria-hidden />
      {authMethod === "chatgpt" && (
        <Dropdown.Section className="flex items-center justify-between px-[var(--padding-row-x)]">
          <RecentsMenuHeader filter={filter} onSelect={setFilter} />
          {filter !== "local" && <RecentTasksMenuEnvironmentsFilterDropdown />}
        </Dropdown.Section>
      )}
      <Dropdown.Section className="vertical-scroll-fade-mask flex max-h-[60vh] flex-col gap-0 overflow-y-auto pb-1">
        {filter === "cloud" &&
          (cloudtasksQuery.isError ? (
            <ErrorState onRetry={() => cloudtasksQuery.refetch()} />
          ) : cloudtasksQuery.isLoading ? (
            <LoadingState />
          ) : filteredRemoteTasks.length === 0 ? (
            hasQuery ? (
              <SearchTasksEmptyState />
            ) : (
              <RecentTasksMenuEmptyState />
            )
          ) : (
            filteredRemoteTasks.map((item) => (
              <CloudTaskRow key={item.key} task={item.task} onClose={onClose} />
            ))
          ))}
        {filter === "local" &&
          (filteredLocalTasks.length ? (
            filteredLocalTasks.map((conversation) => (
              <LocalTaskRow
                key={conversation.id}
                conversation={conversation}
                isActive={activeLocalConversationId === conversation.id}
                onClick={onClose}
              />
            ))
          ) : hasQuery ? (
            <SearchTasksEmptyState />
          ) : (
            <RecentTasksMenuEmptyState />
          ))}
        {filter === "recent" &&
          (cloudtasksQuery.isError && mergedTasks.length === 0 ? (
            <ErrorState onRetry={() => cloudtasksQuery.refetch()} />
          ) : cloudtasksQuery.isLoading && mergedTasks.length === 0 ? (
            <LoadingState />
          ) : filteredMergedTasks.length === 0 ? (
            hasQuery ? (
              <SearchTasksEmptyState />
            ) : (
              <RecentTasksMenuEmptyState />
            )
          ) : (
            <>
              {cloudtasksQuery.isError && (
                <div className="mx-1 my-1 flex items-center justify-between gap-2 px-1 text-base text-token-foreground">
                  <FormattedMessage
                    id="codex.recentTasksMenu.errorCloud.inline"
                    defaultMessage="Failed to load cloud tasks."
                    description="Inline error indicator for cloud tasks in recent feed"
                  />
                  <Button
                    size="default"
                    color="outline"
                    onClick={() => cloudtasksQuery.refetch()}
                  >
                    <FormattedMessage
                      id="codex.common.retry"
                      defaultMessage="Retry"
                      description="Retry button"
                    />
                  </Button>
                </div>
              )}
              {cloudtasksQuery.isPending && !mergedTasks.length && (
                <div className="mx-1 my-1 flex items-center gap-2 text-sm text-token-input-placeholder-foreground">
                  <Spinner className="icon-xs" />
                </div>
              )}
              {filteredMergedTasks.map((item) => (
                <MergedTaskRow
                  key={item.key}
                  item={item}
                  activeLocalConversationId={activeLocalConversationId}
                  onClose={onClose}
                />
              ))}
            </>
          ))}
      </Dropdown.Section>
    </div>
  );
}

function MergedTaskRow({
  item,
  activeLocalConversationId,
  onClose,
}: {
  item: MergedTask;
  activeLocalConversationId: string | null;
  onClose: () => void;
}): React.ReactElement {
  const navigate = useNavigate();
  const { cancelPendingWorktree } = usePendingWorktreeActions();
  switch (item.kind) {
    case "remote": {
      return <CloudTaskRow task={item.task} onClose={onClose} />;
    }
    case "local": {
      return (
        <LocalTaskRow
          conversation={item.conversation}
          isActive={activeLocalConversationId === item.conversation.id}
          onClick={onClose}
        />
      );
    }
    case "pending-worktree": {
      return (
        <WorktreeInitRow
          task={item.pendingWorktree}
          hasAttention={item.pendingWorktree.needsAttention}
          onClick={() => {
            void navigate(`/worktree-init-v2/${item.pendingWorktree.id}`);
            onClose();
          }}
          onArchive={() => {
            cancelPendingWorktree(item.pendingWorktree.id);
          }}
        />
      );
    }
  }
}

function getWorktreeTitle(
  task: Pick<PendingWorktree, "label" | "phase">,
  intl: IntlShape,
): string {
  const trimmed = task.label?.trim();
  if (trimmed && trimmed.length > 0) {
    return trimmed;
  }
  if (task.phase === "failed") {
    return intl.formatMessage({
      id: "recentTasks.worktreeInitFailedTitle",
      defaultMessage: "Worktree init failed",
      description: "Worktree row title when the init script fails",
    });
  }
  return intl.formatMessage({
    id: "recentTasks.worktreeSettingUpTitle",
    defaultMessage: "Setting up worktree",
    description: "Worktree row title while init is pending",
  });
}

function LoadingState(): React.ReactElement {
  return (
    <div className="flex h-48 items-center justify-center gap-2 text-sm text-token-input-placeholder-foreground">
      <Spinner className="icon-xs" />
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }): React.ReactElement {
  return (
    <div className="flex h-48 items-center justify-center gap-3 text-sm text-token-input-placeholder-foreground">
      <FormattedMessage
        id="codex.recentTasksMenu.errorCloud"
        defaultMessage="Failed to load tasks."
        description="Error state for cloud tasks in recent tasks menu"
      />
      <Button size="default" color="outline" onClick={onRetry}>
        <FormattedMessage
          id="codex.common.retry"
          defaultMessage="Retry"
          description="Retry button"
        />
      </Button>
    </div>
  );
}
