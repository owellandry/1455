import type { ConversationId } from "protocol";

import type { AppServerManager } from "@/app-server/app-server-manager";
import type { MergedTask } from "@/header/recent-tasks-menu/use-merge-tasks";
import { DEFAULT_HOST_ID } from "@/shared-objects/use-host-config";
import { CodexRequest } from "@/utils/request";

export type ProjectArchiveableTask =
  | {
      kind: "local";
      conversationId: ConversationId;
      hostId: string;
      threadKey: string;
    }
  | {
      kind: "remote";
      taskId: string;
      threadKey: string;
    };

export function getProjectArchiveableTasks(
  tasks: Array<MergedTask>,
): Array<ProjectArchiveableTask> {
  return tasks.flatMap((task): Array<ProjectArchiveableTask> => {
    if (task.kind === "local") {
      return [
        {
          kind: "local",
          conversationId: task.conversation.id,
          hostId: task.conversation.hostId ?? DEFAULT_HOST_ID,
          threadKey: `local:${task.conversation.id}`,
        },
      ];
    }

    if (task.kind === "remote") {
      const turnStatus =
        task.task.task_status_display?.latest_turn_status_display?.turn_status;
      const isInProgress =
        turnStatus === "in_progress" || turnStatus === "pending";
      const hasTimestamp =
        (task.task.updated_at ?? task.task.created_at ?? null) != null;
      if (isInProgress || !hasTimestamp) {
        return [];
      }
      return [
        {
          kind: "remote",
          taskId: task.task.id,
          threadKey: `remote:${task.task.id}`,
        },
      ];
    }

    return [];
  });
}

export type ProjectThreadArchiveRegistry = Pick<
  {
    getDefault(): AppServerManager;
    getForHostId(hostId: string): AppServerManager | null;
  },
  "getDefault" | "getForHostId"
>;

export async function archiveProjectThreads({
  archiveableTasks,
  currentThreadKey,
  appServerRegistry,
}: {
  archiveableTasks: Array<ProjectArchiveableTask>;
  currentThreadKey: string | null;
  appServerRegistry: ProjectThreadArchiveRegistry;
}): Promise<{
  succeededCount: number;
  failedCount: number;
  archivedCurrentThread: boolean;
  archivedRemoteCount: number;
}> {
  const results = await Promise.all(
    archiveableTasks.map(async (task) => {
      try {
        if (task.kind === "local") {
          const manager =
            appServerRegistry.getForHostId(task.hostId) ??
            (task.hostId === DEFAULT_HOST_ID
              ? appServerRegistry.getDefault()
              : null);
          if (manager == null) {
            throw new Error(`Missing AppServerManager for host ${task.hostId}`);
          }
          await manager.archiveConversation(task.conversationId);
        } else {
          await CodexRequest.safePost("/wham/tasks/{task_id}/archive", {
            parameters: {
              path: { task_id: task.taskId },
            },
          });
        }
        return { ok: true as const, task };
      } catch {
        return { ok: false as const, task };
      }
    }),
  );

  const succeeded = results.filter((result) => result.ok);

  return {
    succeededCount: succeeded.length,
    failedCount: results.length - succeeded.length,
    archivedCurrentThread:
      currentThreadKey != null &&
      succeeded.some((result) => result.task.threadKey === currentThreadKey),
    archivedRemoteCount: succeeded.filter(
      (result) => result.task.kind === "remote",
    ).length,
  };
}
