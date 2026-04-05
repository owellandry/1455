import { createConversationId } from "protocol";
import type { ReactElement } from "react";
import { useEffect, useEffectEvent, useRef } from "react";

import { useDefaultAppServerManager } from "@/app-server/app-server-manager-hooks";
import { logger } from "@/utils/logger";
import { fetchFromVSCode, useFetchFromVSCode } from "@/vscode-api";

export function AutomationRunArchiver(): ReactElement | null {
  const { data: pendingRuns, isSuccess: isPendingRunsReady } =
    useFetchFromVSCode("list-pending-automation-run-threads");
  const appServerManager = useDefaultAppServerManager();
  const hasRunRef = useRef(false);

  const archivePendingRuns = useEffectEvent(
    async (signal: AbortSignal): Promise<void> => {
      if (hasRunRef.current) {
        return;
      }
      hasRunRef.current = true;

      const pendingThreadIds = pendingRuns?.threadIds ?? [];
      if (pendingThreadIds.length === 0) {
        return;
      }

      logger.info("[automation-run-cleanup] archiving pending automation runs");

      try {
        await appServerManager.refreshRecentConversations();
      } catch (error) {
        logger.warning(
          `[automation-run-cleanup] failed to refresh conversations`,
          {
            safe: {},
            sensitive: {
              error: error,
            },
          },
        );
        return;
      }

      const isMissingConversation = (threadId: string): boolean => {
        const conversationId = createConversationId(threadId);
        return appServerManager.getConversation(conversationId) == null;
      };

      let missingThreadIds = pendingThreadIds.filter(isMissingConversation);
      const loadMoreUntilFound = async (): Promise<void> => {
        if (
          missingThreadIds.length === 0 ||
          !appServerManager.hasMoreRecentConversations() ||
          signal.aborted
        ) {
          return;
        }
        try {
          await appServerManager.loadMoreRecentConversations();
        } catch (error) {
          logger.warning(
            `[automation-run-cleanup] failed to load more conversations`,
            {
              safe: {},
              sensitive: {
                error: error,
              },
            },
          );
          return;
        }
        missingThreadIds = missingThreadIds.filter(isMissingConversation);
        await loadMoreUntilFound();
      };
      await loadMoreUntilFound();

      if (signal.aborted) {
        return;
      }

      const archivePromises: Array<Promise<void>> = [];
      for (const threadId of pendingThreadIds) {
        const conversationId = createConversationId(threadId);
        if (appServerManager.getConversation(conversationId)) {
          archivePromises.push(
            appServerManager
              .archiveConversation(conversationId)
              .catch((error) => {
                logger.warning(
                  `[automation-run-cleanup] failed to archive conversation`,
                  {
                    safe: {
                      threadId,
                    },
                    sensitive: {
                      error: error,
                    },
                  },
                );
              }),
          );
          continue;
        }

        archivePromises.push(
          fetchFromVSCode("automation-run-archive", {
            params: { threadId, archivedReason: "auto" },
            signal,
          })
            .then(() => {})
            .catch((error) => {
              logger.warning(
                `[automation-run-cleanup] failed to mark run archived`,
                {
                  safe: {
                    threadId,
                  },
                  sensitive: {
                    error: error,
                  },
                },
              );
            }),
        );
      }

      if (archivePromises.length === 0) {
        return;
      }

      await Promise.all(archivePromises);
    },
  );

  useEffect(() => {
    if (!isPendingRunsReady) {
      return;
    }
    const controller = new AbortController();
    void archivePendingRuns(controller.signal);
    return (): void => {
      controller.abort();
    };
  }, [isPendingRunsReady]);

  return null;
}
