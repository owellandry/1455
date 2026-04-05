import {
  buildHotkeyWindowRemoteConversationRoute,
  buildHotkeyWindowThreadRoute,
} from "protocol";
import type { TaskListItem } from "protocol";

import type { AppServerConversationState } from "@/app-server/app-server-manager-types";
import { isLocalConversationInProgress } from "@/app-server/utils/is-local-conversation-in-progress";
import { shouldHideSubagentConversation } from "@/app-server/utils/is-subagent-conversation";
import { getLocalConversationTitle } from "@/local-conversation/get-local-conversation-title";
import { getProjectName } from "@/thread-layout/get-project-name";

export type HotkeyWindowResumeTarget = {
  key: string;
  kind: "cloud" | "local";
  id: string;
  path: string;
  title: string;
  lastUpdated: number;
  status: "read" | "running" | "unread";
  projectShortName: string | null;
  cwd?: string;
};

function getHotkeyWindowResumeStatus(
  conversation: AppServerConversationState,
): HotkeyWindowResumeTarget["status"] {
  if (isLocalConversationInProgress(conversation)) {
    return "running";
  }
  return conversation.hasUnreadTurn ? "unread" : "read";
}

function getHotkeyWindowCloudResumeStatus(
  task: TaskListItem,
): HotkeyWindowResumeTarget["status"] {
  const turnStatus =
    task.task_status_display?.latest_turn_status_display?.turn_status;
  if (turnStatus === "in_progress" || turnStatus === "pending") {
    return "running";
  }
  return task.has_unread_turn ? "unread" : "read";
}

export function buildHotkeyWindowResumeTargets(
  localConversations: Array<AppServerConversationState>,
  cloudTasks: Array<TaskListItem>,
  isBackgroundSubagentsEnabled: boolean,
): Array<HotkeyWindowResumeTarget> {
  const localTargets = localConversations
    .filter(
      (conversation) =>
        !shouldHideSubagentConversation(
          conversation,
          isBackgroundSubagentsEnabled,
        ),
    )
    .map((conversation) => ({
      key: `local:${conversation.id}`,
      kind: "local" as const,
      id: conversation.id,
      path: buildHotkeyWindowThreadRoute(conversation.id),
      title: getLocalConversationTitle(conversation) ?? conversation.id,
      projectShortName: getProjectName(conversation.cwd),
      lastUpdated: Number.isFinite(conversation.updatedAt)
        ? conversation.updatedAt
        : Number.isFinite(conversation.createdAt)
          ? conversation.createdAt
          : 0,
      status: getHotkeyWindowResumeStatus(conversation),
      cwd: conversation.cwd,
    }));

  const cloudTargets = cloudTasks.map((task) => ({
    key: `cloud:${task.id}`,
    kind: "cloud" as const,
    id: task.id,
    path: buildHotkeyWindowRemoteConversationRoute(task.id),
    title: task.title ?? task.id,
    projectShortName: task.task_status_display?.environment_label ?? null,
    lastUpdated: (task.updated_at ?? task.created_at ?? 0) * 1000,
    status: getHotkeyWindowCloudResumeStatus(task),
  }));

  const seenTargetKeys = new Set<string>();
  return [...localTargets, ...cloudTargets]
    .sort((first, second) => second.lastUpdated - first.lastUpdated)
    .filter((target) => {
      if (seenTargetKeys.has(target.key)) {
        return false;
      }
      seenTargetKeys.add(target.key);
      return true;
    });
}
