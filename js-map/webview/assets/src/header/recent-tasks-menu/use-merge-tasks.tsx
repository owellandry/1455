import { useAtomValue } from "jotai";
import type { CodeEnvironment, TaskListItem } from "protocol";
import { useMemo } from "react";

import type { AppServerConversationState } from "@/app-server/app-server-manager-types";
import { useIsBackgroundSubagentsEnabled } from "@/hooks/use-is-background-subagents-enabled";
import { useWindowType } from "@/hooks/use-window-type";
import { aThreadSortKey } from "@/thread-sort";
import { logger } from "@/utils/logger";
import {
  usePendingWorktrees,
  type PendingWorktree,
} from "@/worktrees-v2/pending-worktree-store";

import { shouldShowConversationInRegularRecentTasks } from "./should-show-conversation-in-regular-recent-tasks";

export type RemoteMergedTask = {
  kind: "remote";
  key: string;
  at: number;
  task: TaskListItem;
};

export type LocalMergedTask = {
  kind: "local";
  key: string;
  at: number;
  conversation: AppServerConversationState;
};

export type PendingWorktreeTask = {
  kind: "pending-worktree";
  key: string;
  at: number;
  pendingWorktree: PendingWorktree;
};

export type MergedTask =
  | RemoteMergedTask
  | LocalMergedTask
  | PendingWorktreeTask;

export function useMergedTasks(
  tasks: Array<TaskListItem> | undefined,
  localConversations: Array<AppServerConversationState>,
  envForFilter: CodeEnvironment | null,
): Array<MergedTask> {
  const pendingWorktrees = usePendingWorktrees();
  const threadSortKey = useAtomValue(aThreadSortKey);
  const isBackgroundSubagentsEnabled = useIsBackgroundSubagentsEnabled();
  const windowType = useWindowType();

  return useMemo(() => {
    const remoteSrc = tasks ?? [];
    const localSrc = (localConversations ?? []).filter((conversation) =>
      shouldShowConversationInRegularRecentTasks({
        conversation,
        isBackgroundSubagentsEnabled,
        windowType,
      }),
    );
    const pendingSrc = pendingWorktrees ?? [];
    const remoteFiltered = envForFilter
      ? remoteSrc.filter(
          (t) =>
            t.task_status_display?.environment_label === envForFilter.label,
        )
      : remoteSrc;
    const remote = remoteFiltered.map((t) => {
      const timestampSeconds =
        threadSortKey === "updated_at"
          ? (t.updated_at ?? t.created_at ?? 0)
          : (t.created_at ?? t.updated_at ?? 0);
      return {
        kind: "remote" as const,
        key: `remote:${t.id}`,
        at: timestampSeconds * 1000,
        task: t,
      };
    });
    const locals = localSrc.map((c) => {
      const localTimestamp =
        threadSortKey === "updated_at" ? c.updatedAt : c.createdAt;
      if (!Number.isFinite(localTimestamp)) {
        logger.error("local conversation has invalid createdAt or updatedAt");
      }
      const timestamp = Number.isFinite(localTimestamp)
        ? localTimestamp
        : Number.isFinite(c.createdAt)
          ? c.createdAt
          : 0;
      return {
        kind: "local" as const,
        key: `local:${c.id}`,
        at: timestamp,
        conversation: c,
      };
    });
    const pending: Array<PendingWorktreeTask> = pendingSrc.map((entry) => ({
      kind: "pending-worktree" as const,
      key: `pending-worktree:${entry.id}`,
      at: entry.createdAt,
      pendingWorktree: entry,
    }));
    return [...remote, ...locals, ...pending].sort((a, b) => b.at - a.at);
  }, [
    tasks,
    envForFilter,
    isBackgroundSubagentsEnabled,
    localConversations,
    pendingWorktrees,
    threadSortKey,
    windowType,
  ]);
}
