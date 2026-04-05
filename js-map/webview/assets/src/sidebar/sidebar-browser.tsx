import type { ReactElement } from "react";

import { useTasks } from "@/codex-api";
import { AppHeader } from "@/components/app/app-header";
import { NewChatButton } from "@/header/new-chat-button";
import { RecentTasksInline } from "@/header/recent-tasks-inline";
import { useMergedTasks } from "@/header/recent-tasks-menu/use-merge-tasks";
import { ProfileFooter } from "@/sign-in/profile-footer";

/** Browser+webview sidebar that mirrors the electron list in a simple column. */
export function SidebarBrowser(): ReactElement {
  const tasksQuery = useTasks({
    taskFilter: "current",
    limit: 20,
    enabled: true,
  });
  const mergedTasks = useMergedTasks(tasksQuery.data, [], null);

  return (
    <>
      <AppHeader
        sidebar={
          <div className="draggable flex h-toolbar w-full items-center justify-end gap-1">
            <NewChatButton />
          </div>
        }
        hideDivider
      />
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-panel">
          <RecentTasksInline
            mergedTasks={mergedTasks}
            tasksQuery={tasksQuery}
          />
        </div>
        <ProfileFooter />
      </div>
    </>
  );
}
