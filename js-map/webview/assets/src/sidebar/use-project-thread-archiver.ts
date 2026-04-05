import { useQueryClient } from "@tanstack/react-query";
import { useScope } from "maitai";
import { useState } from "react";
import { useIntl } from "react-intl";

import { useAppServerRegistry } from "@/app-server/app-server-manager-hooks";
import { toast$ } from "@/components/toaster/toast-signal";
import type { MergedTask } from "@/header/recent-tasks-menu/use-merge-tasks";
import { AppScope } from "@/scopes/app-scope";

import {
  archiveProjectThreads,
  getProjectArchiveableTasks,
} from "./project-archive";

export function useProjectThreadArchiver({
  projectLabel,
  tasks,
  currentThreadKey,
  onArchivedCurrentThread,
  onOpenChange,
}: {
  projectLabel: string;
  tasks: Array<MergedTask>;
  currentThreadKey: string | null;
  onArchivedCurrentThread?: () => void;
  onOpenChange: (open: boolean) => void;
}): {
  archiveableCount: number;
  isArchiving: boolean;
  isConfirmOpen: boolean;
  setIsConfirmOpen: (open: boolean) => void;
  handleArchiveConfirm: () => void;
} {
  const intl = useIntl();
  const scope = useScope(AppScope);
  const queryClient = useQueryClient();
  const appServerRegistry = useAppServerRegistry();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const archiveableTasks = getProjectArchiveableTasks(tasks);

  const handleArchiveConfirm = (): void => {
    if (archiveableTasks.length === 0 || isArchiving) {
      return;
    }

    setIsArchiving(true);
    void (async (): Promise<void> => {
      const {
        succeededCount,
        failedCount,
        archivedCurrentThread,
        archivedRemoteCount,
      } = await archiveProjectThreads({
        archiveableTasks,
        currentThreadKey,
        appServerRegistry,
      });

      if (archivedRemoteCount > 0) {
        void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      }

      setIsArchiving(false);
      setIsConfirmOpen(false);
      onOpenChange(false);

      if (archivedCurrentThread) {
        onArchivedCurrentThread?.();
      }

      if (succeededCount > 0 && failedCount === 0) {
        scope.get(toast$).success(
          intl.formatMessage(
            {
              id: "sidebarElectron.archiveProjectThreads.success",
              defaultMessage:
                "Archived {count, plural, one {# thread} other {# threads}}",
              description:
                "Success toast after archiving all archiveable threads in a project",
            },
            { count: succeededCount },
          ),
        );
        return;
      }

      if (succeededCount > 0) {
        scope.get(toast$).danger(
          intl.formatMessage(
            {
              id: "sidebarElectron.archiveProjectThreads.partialError",
              defaultMessage:
                "Archived {successCount, plural, one {# thread} other {# threads}} in {projectLabel}; {failedCount} failed.",
              description:
                "Error toast shown when only some project threads archive successfully",
            },
            {
              successCount: succeededCount,
              failedCount,
              projectLabel,
            },
          ),
        );
        return;
      }

      scope.get(toast$).danger(
        intl.formatMessage(
          {
            id: "sidebarElectron.archiveProjectThreads.error",
            defaultMessage:
              "Failed to archive active threads in {projectLabel}.",
            description:
              "Error toast shown when archiving all archiveable threads in a project fails",
          },
          { projectLabel },
        ),
      );
    })();
  };

  return {
    archiveableCount: archiveableTasks.length,
    isArchiving,
    isConfirmOpen,
    setIsConfirmOpen,
    handleArchiveConfirm,
  };
}
