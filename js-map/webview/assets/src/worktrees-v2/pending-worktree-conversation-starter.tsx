import { useScope } from "maitai";
import {
  buildHotkeyWindowThreadRoute,
  buildHotkeyWindowWorktreeInitRoute,
  buildWorktreeInitRoute,
  maybeErrorToString,
} from "protocol";
import { useEffect, useEffectEvent } from "react";
import { useIntl } from "react-intl";
import { useLocation } from "react-router";

import { useAppServerRegistry } from "@/app-server/app-server-manager-hooks";
import { toast$ } from "@/components/toaster/toast-signal";
import { isHotkeyWindowContextFromWindow } from "@/hotkey-window/is-hotkey-window-context";
import { messageBus } from "@/message-bus";
import { AppScope } from "@/scopes/app-scope";
import { useHostConfig } from "@/shared-objects/use-host-config";
import { useSharedObject } from "@/shared-objects/use-shared-object";
import { logger } from "@/utils/logger";

import {
  applyPendingWorktreeConversationMetadata,
  launchPendingWorktreeConversation,
} from "./pending-worktree-conversation";
import {
  usePendingWorktreeConversationStarts,
  usePendingWorktreeConversationStartActions,
} from "./pending-worktree-conversation-starts";
import {
  getPendingWorktreeAppServerManager,
  getPendingWorktreeHostConfig,
} from "./pending-worktree-host";
import {
  usePendingWorktreeActions,
  usePendingWorktrees,
} from "./pending-worktree-store";

export function PendingWorktreeConversationStarter(): null {
  const appServerRegistry = useAppServerRegistry();
  const pendingWorktrees = usePendingWorktrees();
  const pendingConversationStarts = usePendingWorktreeConversationStarts();
  const { cancelPendingWorktree, dismissPendingWorktree } =
    usePendingWorktreeActions();
  const {
    beginPendingWorktreeConversationStart,
    failPendingWorktreeConversationStart,
    removePendingWorktreeConversationStart,
    succeedPendingWorktreeConversationStart,
  } = usePendingWorktreeConversationStartActions();
  const defaultHostConfig = useHostConfig(
    appServerRegistry.getDefault().getHostId(),
  );
  const [remoteConnectionsData] = useSharedObject("remote_connections");
  const location = useLocation();
  const intl = useIntl();
  const scope = useScope(AppScope);
  const startPendingWorktreeConversationEvent = useEffectEvent(
    async ({
      pendingWorktreeId,
      workspaceRoot,
    }: {
      pendingWorktreeId: string;
      workspaceRoot: string;
    }) => {
      const entry = pendingWorktrees.find(
        (pendingWorktree) => pendingWorktree.id === pendingWorktreeId,
      );
      if (entry == null) {
        removePendingWorktreeConversationStart(pendingWorktreeId);
        return;
      }

      try {
        const mcpManager = getPendingWorktreeAppServerManager(
          appServerRegistry,
          entry,
        );
        const hostConfig = getPendingWorktreeHostConfig(
          entry,
          defaultHostConfig,
          remoteConnectionsData,
        );
        if (mcpManager == null || hostConfig == null) {
          throw new Error(
            `Pending worktree host ${entry.hostId} is unavailable`,
          );
        }
        const conversationId = await launchPendingWorktreeConversation({
          entry,
          mcpManager,
          workspaceRoot,
        });
        await applyPendingWorktreeConversationMetadata({
          entry,
          conversationId,
          hostConfig,
          mcpManager,
        });
        succeedPendingWorktreeConversationStart(entry.id, conversationId);
        if (isHotkeyWindowContextFromWindow()) {
          messageBus.dispatchMessage("open-in-hotkey-window", {
            path: buildHotkeyWindowThreadRoute(conversationId),
          });
        }
        if (
          !isWorktreeInitRouteForPendingWorktree(location.pathname, entry.id)
        ) {
          dismissPendingWorktree(entry.id);
        }
      } catch (error) {
        failPendingWorktreeConversationStart(pendingWorktreeId);
        logger.error("Error starting worktree conversation", {
          safe: {},
          sensitive: { error },
        });
        scope.get(toast$).danger(
          intl.formatMessage(
            {
              id: "composer.localTaskError.v2",
              defaultMessage: "Error starting thread{br}{error}",
              description: "Toast text shown when we failed to start a thread",
            },
            {
              br: <br />,
              error: maybeErrorToString(error),
            },
          ),
        );
      }
    },
  );

  useEffect(() => {
    if (window.electronBridge == null) {
      return;
    }

    pendingConversationStarts.forEach((pendingConversationStart) => {
      if (pendingConversationStart.state === "succeeded") {
        if (
          isWorktreeInitRouteForPendingWorktree(
            location.pathname,
            pendingConversationStart.pendingWorktreeId,
          )
        ) {
          return;
        }

        dismissPendingWorktree(pendingConversationStart.pendingWorktreeId);
        return;
      }

      if (pendingConversationStart.state !== "waiting") {
        return;
      }

      const entry = pendingWorktrees.find(
        (pendingWorktree) =>
          pendingWorktree.id === pendingConversationStart.pendingWorktreeId,
      );
      if (
        entry == null ||
        entry.phase !== "worktree-ready" ||
        entry.worktreeWorkspaceRoot == null
      ) {
        return;
      }

      if (!beginPendingWorktreeConversationStart(entry.id)) {
        return;
      }

      void startPendingWorktreeConversationEvent({
        pendingWorktreeId: entry.id,
        workspaceRoot: entry.worktreeWorkspaceRoot,
      });
    });
  }, [
    beginPendingWorktreeConversationStart,
    cancelPendingWorktree,
    dismissPendingWorktree,
    location.pathname,
    pendingConversationStarts,
    pendingWorktrees,
    appServerRegistry,
    defaultHostConfig,
    remoteConnectionsData,
  ]);

  return null;
}

function isWorktreeInitRouteForPendingWorktree(
  pathname: string,
  pendingWorktreeId: string,
): boolean {
  return (
    pathname === buildWorktreeInitRoute(pendingWorktreeId) ||
    pathname === buildHotkeyWindowWorktreeInitRoute(pendingWorktreeId)
  );
}
