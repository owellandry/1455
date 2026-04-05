import { useQueryClient } from "@tanstack/react-query";
import type * as AppServer from "app-server-types";
import {
  buildWorkspaceWritePermissionsConfig,
  type ConversationId,
} from "protocol";
import { useRef } from "react";

import {
  useAppServerRegistry,
  useDefaultAppServerManager,
} from "./app-server/app-server-manager-hooks";
import { maybeResumeConversation } from "./app-server/requests/maybe-resume-conversation";
import { startTurn } from "./app-server/requests/start-turn";
import { isMiniWindow as isMiniWindowFn } from "./app-server/utils/is-mini-window";
import { useCollaborationMode } from "./composer/use-collaboration-mode";
import { useActiveConversationId } from "./hooks/use-active-conversation-id";
import { useMessage } from "./message-bus";
import { logger } from "./utils/logger";
import { useFetchFromVSCode } from "./vscode-api";

export function MessageHandlerAppServerHandlers(): React.ReactElement | null {
  const queryClient = useQueryClient();
  const mcpManager = useDefaultAppServerManager();
  const appServerRegistry = useAppServerRegistry();
  const isMiniWindow = isMiniWindowFn();
  const conversationId = useActiveConversationId();
  const { activeMode: activeCollaborationMode } =
    useCollaborationMode(conversationId);
  const { data: workspaceRootsResponse } = useFetchFromVSCode(
    "active-workspace-roots",
  );
  const websocketReconnectRecoveryPromisesRef = useRef<
    Map<string, Promise<void>>
  >(new Map());
  const appServerRestartRecoveryInFlightHostIdsRef = useRef<Set<string>>(
    new Set(),
  );

  async function resumeConversationIfNeeded(
    targetManager: typeof mcpManager,
    targetConversationId: ConversationId,
  ): Promise<boolean> {
    const targetConversation =
      targetManager.getConversation(targetConversationId);
    const workspaceRoots =
      workspaceRootsResponse?.roots && workspaceRootsResponse.roots.length > 0
        ? workspaceRootsResponse.roots
        : [targetManager.getConversationCwd(targetConversationId) ?? "/"];
    const collaborationMode =
      targetConversation?.latestCollaborationMode ?? activeCollaborationMode;

    if (!targetManager.needsResume(targetConversationId)) {
      return false;
    }

    await maybeResumeConversation(targetManager, {
      conversationId: targetConversationId,
      model: null,
      reasoningEffort: null,
      workspaceRoots,
      collaborationMode,
    });

    return true;
  }

  async function runWebsocketReconnectRecovery(hostId: string): Promise<void> {
    const existingRecovery =
      websocketReconnectRecoveryPromisesRef.current.get(hostId);
    if (existingRecovery) {
      await existingRecovery;
      return;
    }

    const recoveryPromise = (async (): Promise<void> => {
      try {
        const targetManager = appServerRegistry.getForHostIdOrThrow(hostId);
        logger.info("websocket_reconnect_recovery_start", {
          safe: { hostId, currentConversationId: conversationId ?? null },
          sensitive: {},
        });
        let refreshRecentConversationsFailed = false;
        try {
          await targetManager.refreshRecentConversations();
        } catch (error) {
          refreshRecentConversationsFailed = true;
          logger.warning(
            "websocket_reconnect_recovery_thread_list_refresh_failed",
            {
              safe: { hostId, currentConversationId: conversationId ?? null },
              sensitive: { error },
            },
          );
        }
        targetManager.markAllConversationsNeedResumeAfterReconnect();

        const currentConversationExistsOnTargetHost =
          conversationId != null &&
          targetManager.getConversation(conversationId) != null;
        const resumedCurrentConversation =
          !currentConversationExistsOnTargetHost || conversationId == null
            ? false
            : await resumeConversationIfNeeded(targetManager, conversationId);

        logger.info("websocket_reconnect_recovery_done", {
          safe: {
            hostId,
            currentConversationId: conversationId ?? null,
            currentConversationExistsOnTargetHost,
            resumedCurrentConversation,
            refreshRecentConversationsFailed,
          },
          sensitive: {},
        });
      } catch (error) {
        logger.error("websocket_reconnect_recovery_failed", {
          safe: { hostId, conversationId: conversationId ?? null },
          sensitive: { error },
        });
      } finally {
        websocketReconnectRecoveryPromisesRef.current.delete(hostId);
      }
    })();

    websocketReconnectRecoveryPromisesRef.current.set(hostId, recoveryPromise);
    await recoveryPromise;
  }

  /**
   * Windows sandbox setup writes config and then restarts the local app-server.
   * After that restart, the renderer needs to refresh config-backed queries,
   * mark local threads dirty, and re-resume the active one so the UI picks up
   * the new sandbox mode and refreshed session state.
   */
  async function runAppServerRestartRecovery(hostId: string): Promise<void> {
    const websocketReconnectRecovery =
      websocketReconnectRecoveryPromisesRef.current.get(hostId);
    if (websocketReconnectRecovery != null) {
      await websocketReconnectRecovery;
    }

    if (appServerRestartRecoveryInFlightHostIdsRef.current.has(hostId)) {
      return;
    }

    appServerRestartRecoveryInFlightHostIdsRef.current.add(hostId);
    try {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["user-saved-config"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["windows-sandbox", "mode", hostId],
        }),
      ]);
      const targetManager = appServerRegistry.getForHostIdOrThrow(hostId);
      targetManager.clearPrewarmedThreads();
      targetManager.markAllConversationsNeedResumeAfterReconnect();
      const currentConversationExistsOnTargetHost =
        conversationId != null &&
        targetManager.getConversation(conversationId) != null;
      const resumedCurrentConversation =
        !currentConversationExistsOnTargetHost || conversationId == null
          ? false
          : await resumeConversationIfNeeded(targetManager, conversationId);

      logger.info("app_server_restart_recovery_done", {
        safe: {
          hostId,
          currentConversationId: conversationId ?? null,
          currentConversationExistsOnTargetHost,
          resumedCurrentConversation,
        },
        sensitive: {},
      });
    } catch (error) {
      logger.error("app_server_restart_recovery_failed", {
        safe: { hostId, conversationId: conversationId ?? null },
        sensitive: { error },
      });
    } finally {
      appServerRestartRecoveryInFlightHostIdsRef.current.delete(hostId);
    }
  }

  useMessage(
    "codex-app-server-connection-changed",
    (message): void => {
      logger.info("remote_connections.connection_state_changed", {
        safe: { state: message.state },
        sensitive: {
          errorMessage: message.mostRecentErrorMessage,
          hostId: message.hostId,
        },
      });
      const manager = appServerRegistry.getForHostId(message.hostId);
      if (manager == null) {
        logger.info(
          "remote_connections.connection_state_ignored_for_missing_manager",
          {
            safe: { state: message.state },
            sensitive: { hostId: message.hostId },
          },
        );
        return;
      }
      manager.setConnectionState(
        message.state,
        message.mostRecentErrorMessage,
        "host_connection_state_changed",
      );
      appServerRegistry.notifyRegistryChanged();

      if (message.transport !== "websocket" || message.state !== "connected") {
        return;
      }
      if (isMiniWindow) {
        return;
      }
      void runWebsocketReconnectRecovery(message.hostId);
    },
    [
      mcpManager,
      appServerRegistry,
      isMiniWindow,
      conversationId,
      activeCollaborationMode,
      workspaceRootsResponse?.roots,
    ],
  );

  useMessage(
    "codex-app-server-initialized",
    (message): void => {
      if (isMiniWindow) {
        return;
      }
      void runAppServerRestartRecovery(message.hostId);
    },
    [
      isMiniWindow,
      mcpManager,
      conversationId,
      activeCollaborationMode,
      workspaceRootsResponse?.roots,
      appServerRegistry,
      queryClient,
    ],
  );

  useMessage(
    "desktop-notification-action",
    (message): void => {
      const hostManager = appServerRegistry.getForHostIdOrThrow(message.hostId);
      const { actionType, reply } = message;
      if (actionType !== "reply") {
        return;
      }
      const targetConversationId =
        (message.conversationId as ConversationId | null | undefined) ?? null;
      const localConversation = targetConversationId
        ? hostManager.getConversation(targetConversationId)
        : null;
      if (
        !targetConversationId ||
        !localConversation ||
        typeof reply !== "string" ||
        reply.trim().length === 0
      ) {
        return;
      }
      const input: Array<AppServer.v2.UserInput> = [
        { type: "text", text: reply, text_elements: [] },
      ];
      const latestTurn =
        localConversation.turns[localConversation.turns.length - 1];
      const defaultPermissions = buildWorkspaceWritePermissionsConfig([]);
      void startTurn(hostManager, targetConversationId, {
        input,
        cwd: localConversation.cwd ?? null,
        approvalPolicy:
          latestTurn?.params.approvalPolicy ??
          defaultPermissions.approvalPolicy,
        sandboxPolicy:
          latestTurn?.params.sandboxPolicy ?? defaultPermissions.sandboxPolicy,
        model: null,
        effort: null,
        collaborationMode:
          latestTurn?.params.collaborationMode ??
          localConversation.latestCollaborationMode ??
          activeCollaborationMode,
      }).catch((error) => {
        logger.error(`[desktop-notifications] reply failed`, {
          safe: {},
          sensitive: { error },
        });
      });
    },
    [mcpManager, appServerRegistry, activeCollaborationMode],
  );

  useMessage(
    "thread-stream-resume-request",
    (message): void => {
      const hostManager = appServerRegistry.getForHostIdOrThrow(message.hostId);
      if (isMiniWindow) {
        return;
      }
      void resumeConversationIfNeeded(
        hostManager,
        message.conversationId,
      ).catch((error) => {
        logger.error("thread_stream_resume_request_failed", {
          safe: { conversationId: message.conversationId },
          sensitive: { error },
        });
      });
    },
    [
      isMiniWindow,
      mcpManager,
      activeCollaborationMode,
      workspaceRootsResponse?.roots,
      appServerRegistry,
    ],
  );

  return null;
}
