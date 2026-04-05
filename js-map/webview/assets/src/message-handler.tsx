import { useQueryClient } from "@tanstack/react-query";
import type * as AppServer from "app-server-types";
import { useSetAtom } from "jotai";
import {
  createMcpRequestId,
  GlobalStateKey,
  INBOX_MESSAGE_TYPES,
  isAppServerWebviewNotificationMethod,
  type AppServerNotificationParamsForMethod,
  type ConversationId,
  type McpRequestId,
  type MessageForView,
} from "protocol";
import { useEffect } from "react";
import { useNavigate } from "react-router";

import {
  useAppServerRegistry,
  useDefaultAppServerManager,
} from "./app-server/app-server-manager-hooks";
import { setModelAndReasoningForNextTurn } from "./app-server/requests/set-model-and-reasoning-for-next-turn";
import { useAppConnectOAuthState } from "./apps/app-connect-oauth";
import { useRefetchIsCopilotApiAvailable } from "./auth/use-is-copilot-api-available";
import { isCompactWindowContextFromWindow } from "./compact-window/is-compact-window-context";
import { aFatalError } from "./fatal-error-atom";
import { getTrustedMessageForView } from "./get-trusted-message-for-view";
import { useGlobalState } from "./hooks/use-global-state";
import { handleIpcBroadcastMessage } from "./ipc-broadcast-message-handler";
import { messageBus } from "./message-bus";
import { APPS_LIST_QUERY_KEY } from "./queries/apps-queries";
import { logger } from "./utils/logger";
import { getQueryKey, VSCODE_QUERY_KEY_PREFIX } from "./vscode-api";
import { codexWorktreesQueryKey } from "./worktrees/worktree-query-keys";

/** Top-level router for postMessage traffic from the host. */
export function MessageHandler({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  // TODO: MessageHandler should be very high in the tree so that if a Provider ever blocks its children to wait for some
  // sort of initialization (like statsig) then we don't prevent the webview from being able to communicate with the extension.
  const defaultAppServerManager = useDefaultAppServerManager();
  const appServerRegistry = useAppServerRegistry();
  const navigate = useNavigate();
  const refetchIsCopilotApiAvailable = useRefetchIsCopilotApiAvailable();
  const queryClient = useQueryClient();
  const setFatalError = useSetAtom(aFatalError);
  const isCompactWindow = isCompactWindowContextFromWindow();
  const { setData: setUseCopilotAuth } = useGlobalState(
    "use-copilot-auth-if-available",
  );
  const { setData: setQueuedFollowUpsState } = useGlobalState(
    GlobalStateKey.QUEUED_FOLLOW_UPS,
  );
  const { claimAppConnectOAuthCallback } = useAppConnectOAuthState();
  useEffect(() => {
    const handleParsedMessage = async (
      message: MessageForView,
    ): Promise<void> => {
      switch (message.type) {
        case "worker-response":
        case "worker-event": {
          // Handled by worker clients (e.g. GitRpcClient).
          break;
        }
        case "fetch-response": {
          // Handled by the web fetch wrapper.
          break;
        }
        case "fetch-stream-event":
        case "fetch-stream-error":
        case "fetch-stream-complete": {
          // Handled by the web fetch wrapper.
          break;
        }
        case "shared-object-updated": {
          // Handled via shared object hooks.
          break;
        }
        case "chat-font-settings": {
          const root = document.documentElement;
          if (typeof message.chatFontSize === "number") {
            root.style.setProperty(
              "--vscode-chat-font-size",
              `${message.chatFontSize}px`,
            );
          } else {
            root.style.removeProperty("--vscode-chat-font-size");
          }
          if (typeof message.chatCodeFontSize === "number") {
            root.style.setProperty(
              "--vscode-chat-editor-font-size",
              `${message.chatCodeFontSize}px`,
            );
          } else {
            root.style.removeProperty("--vscode-chat-editor-font-size");
          }
          break;
        }
        case "active-workspace-roots-updated":
        case "workspace-root-options-updated": {
          // When workspace roots change, invalidate tasks so listings refresh
          void queryClient.invalidateQueries({
            queryKey: [VSCODE_QUERY_KEY_PREFIX],
          });
          break;
        }
        case "workspace-root-option-picked": {
          // Handled via the message bus subscribers.
          break;
        }
        case "workspace-root-option-added": {
          // Handled via the message bus subscribers.
          break;
        }
        case "electron-onboarding-skip-workspace-result": {
          // Handled via the message bus subscribers.
          break;
        }
        case "electron-onboarding-pick-workspace-or-create-default-result": {
          // Handled via the message bus subscribers.
          break;
        }
        case "tasks-reload-requested": {
          if (!isCompactWindow) {
            void queryClient.invalidateQueries({ queryKey: ["tasks"] });
          }
          break;
        }
        case "worktrees-reload-requested": {
          void queryClient.invalidateQueries({
            queryKey: codexWorktreesQueryKey(message.hostId),
          });
          break;
        }
        case "thread-title-updated": {
          const hostManager =
            appServerRegistry.getForHostIdOrThrowWhenDefaultHost(
              message.hostId,
            );
          if (hostManager == null) {
            logIgnoredStaleRemoteMessage(message.hostId, message.type);
            break;
          }
          hostManager.cacheThreadTitle(message.conversationId, message.title);
          if (hostManager.getConversation(message.conversationId) == null) {
            break;
          }
          hostManager.updateConversationState(
            message.conversationId,
            (draft) => {
              draft.title = message.title;
            },
          );
          break;
        }
        case "hotkey-window-transition": {
          // Handled by the hotkey window transition provider.
          break;
        }
        case INBOX_MESSAGE_TYPES.CHANGED: {
          if (!isCompactWindow) {
            void queryClient.invalidateQueries({
              queryKey: getQueryKey("inbox-items", { limit: 200 }),
            });
            void queryClient.invalidateQueries({
              queryKey: getQueryKey("list-automations"),
            });
          }
          break;
        }
        case "mcp-response": {
          const hostManager =
            appServerRegistry.getForHostIdOrThrowWhenDefaultHost(
              message.hostId,
            );
          if (hostManager == null) {
            logIgnoredStaleRemoteMessage(message.hostId, message.type);
            break;
          }
          if (message.message.result) {
            hostManager.onResult(
              message.message.id as McpRequestId,
              message.message.result,
            );
          } else if (message.message.error) {
            hostManager.onError(
              message.message.id as McpRequestId,
              message.message.error,
            );
          } else {
            logger.error(`Invalid MCP message: missing result/error`, {
              safe: {},
              sensitive: {
                id: message.message.id,
              },
            });
          }
          break;
        }
        case "codex-app-server-fatal-error": {
          defaultAppServerManager.setConnectionState(
            "disconnected",
            message.errorMessage,
            "fatal_error_message",
          );
          setFatalError(message);
          break;
        }
        case "mcp-notification": {
          const hostManager =
            appServerRegistry.getForHostIdOrThrowWhenDefaultHost(
              message.hostId,
            );
          if (hostManager == null) {
            logIgnoredStaleRemoteMessage(message.hostId, message.type);
            break;
          }
          if (message.method === "codex/event/skills_update_available") {
            void queryClient.invalidateQueries({ queryKey: ["skills"] });
            break;
          }
          if (message.method === "app/list/updated") {
            const { data } =
              message.params as AppServer.v2.AppListUpdatedNotification;
            queryClient.setQueryData<Array<AppServer.v2.AppInfo>>(
              APPS_LIST_QUERY_KEY,
              data,
            );
            break;
          }
          if (!isAppServerWebviewNotificationMethod(message.method)) {
            break;
          }
          hostManager.onNotification(
            message.method,
            message.params as AppServerNotificationParamsForMethod<
              typeof message.method
            >,
          );
          break;
        }
        case "mcp-request": {
          const { request } = message;
          const hostManager =
            appServerRegistry.getForHostIdOrThrowWhenDefaultHost(
              message.hostId,
            );
          if (hostManager == null) {
            logIgnoredStaleRemoteMessage(message.hostId, message.type);
            break;
          }
          hostManager.onRequest(request);
          break;
        }
        case "desktop-notification-action": {
          const hostManager =
            appServerRegistry.getForHostIdOrThrowWhenDefaultHost(
              message.hostId,
            );
          if (hostManager == null) {
            logIgnoredStaleRemoteMessage(message.hostId, message.type);
            break;
          }
          const { requestId, actionType } = message;
          const conversationId =
            (message.conversationId as ConversationId | null | undefined) ??
            null;
          const localConversation = conversationId
            ? hostManager.getConversation(conversationId)
            : null;
          logger.info("[desktop-notifications] action", {
            safe: {
              actionType,
              conversationId: conversationId ?? "unknown",
              requestId: requestId ?? "none",
            },
            sensitive: {},
          });
          if (actionType === "open") {
            if (conversationId) {
              if (localConversation) {
                void navigate(`/local/${conversationId}`);
              } else {
                void navigate(`/remote/${conversationId}`);
              }
            }
            break;
          }
          if (conversationId && localConversation) {
            void navigate(`/local/${conversationId}`);
          }
          if (actionType === "reply") {
            // Handled by MessageHandlerAppServerHandlers.
            break;
          }
          if (requestId != null && conversationId && localConversation) {
            const mcpRequestId = createMcpRequestId(requestId);
            const decision =
              actionType === "approve"
                ? "accept"
                : actionType === "approve-for-session"
                  ? "acceptForSession"
                  : actionType === "decline"
                    ? "decline"
                    : null;
            if (decision) {
              const request = localConversation.requests.find(
                (entry) => entry.id === mcpRequestId,
              );
              if (!request) {
                logger.error("Request not found", {
                  safe: { requestId: mcpRequestId },
                  sensitive: {},
                });
                break;
              }
              if (request.method === "item/commandExecution/requestApproval") {
                hostManager.replyWithCommandExecutionApprovalDecision(
                  conversationId,
                  mcpRequestId,
                  decision,
                );
              } else if (request.method === "item/fileChange/requestApproval") {
                hostManager.replyWithFileChangeApprovalDecision(
                  conversationId,
                  mcpRequestId,
                  decision,
                );
              } else {
                logger.error("Unknown approval request method", {
                  safe: { method: request.method },
                  sensitive: {},
                });
              }
            }
          }
          break;
        }
        case "navigate-to-route": {
          // This message is handled by the NavigationHandler in App.tsx.
          // No action needed here.
          break;
        }
        case "connector-oauth-callback": {
          void navigate("/connector/oauth_callback", {
            state: {
              fullRedirectUrl: message.fullRedirectUrl,
              returnTo: message.returnTo,
            },
          });
          break;
        }
        case "navigate-back":
        case "navigate-forward": {
          // Handled via NavigationHandler subscriptions.
          break;
        }
        case "command-menu": {
          // Handled by the command menu subscriber.
          break;
        }
        case "thread-overlay-open-current": {
          // Handled by ThreadOverlayOpenCurrentHandler.
          break;
        }
        case "find-in-thread": {
          break;
        }
        case "is-copilot-api-available-updated": {
          refetchIsCopilotApiAvailable();
          break;
        }
        case "implement-todo": {
          // Handled by TodoHandler.
          break;
        }
        case "log-out": {
          await setUseCopilotAuth(false);
          await defaultAppServerManager.logout();
          void navigate("/login");
          break;
        }
        case "automation-runs-updated": {
          if (!isCompactWindow) {
            void queryClient.invalidateQueries({
              queryKey: getQueryKey("inbox-items", { limit: 200 }),
            });
            void queryClient.invalidateQueries({
              queryKey: getQueryKey("list-automations"),
            });
          }
          break;
        }
        case "add-context-file":
        case "new-chat": {
          void queryClient.invalidateQueries({
            queryKey: getQueryKey("inbox-items", { limit: 200 }),
          });
          break;
        }
        case "pinned-threads-updated":
        case "copy-conversation-path":
        case "toggle-thread-pin":
        case "rename-thread":
        case "archive-thread":
        case "copy-working-directory":
        case "copy-session-id":
        case "copy-deeplink":
        case "toggle-sidebar":
        case "toggle-terminal":
        case "toggle-diff-panel":
        case "trace-recording-state-changed":
        case "trace-recording-uploaded":
        case "step-font-size":
        case "step-window-zoom":
        case "reset-window-zoom":
        case "previous-thread":
        case "next-thread":
        case "go-to-thread-index": {
          // Handled via the message bus subscribers.
          break;
        }
        case "toggle-query-devtools": {
          // Handled via the message bus subscribers.
          break;
        }
        case "window-fullscreen-changed": {
          // Handled by window control safe-area hook.
          break;
        }
        case "app-update-ready-changed": {
          // Handled by app update ready state hook.
          break;
        }
        case "electron-window-focus-changed": {
          // Handled by notification focus hook.
          break;
        }
        case "terminal-data":
        case "terminal-exit":
        case "terminal-error":
        case "terminal-init-log":
        case "terminal-attached": {
          // Handled via terminal service subscriptions.
          break;
        }
        case "custom-prompts-updated": {
          // Handled via prompts hook.
          break;
        }
        case "persisted-atom-sync":
        case "persisted-atom-updated": {
          // Handled via persisted state provider.
          break;
        }
        case "electron-app-state-snapshot-request": {
          const hostManager =
            appServerRegistry.getForHostIdOrThrowWhenDefaultHost(
              message.hostId,
            );
          if (hostManager == null) {
            logIgnoredStaleRemoteMessage(message.hostId, message.type);
            break;
          }
          messageBus.dispatchMessage("electron-app-state-snapshot-response", {
            requestId: message.requestId,
            fields: hostManager.collectAppStateSnapshot(message.reason),
          });
          break;
        }
        case "ipc-broadcast": {
          handleIpcBroadcastMessage({
            claimAppConnectOAuthCallback,
            isCompactWindow,
            message,
            navigate,
            queryClient,
          });
          break;
        }
        case "thread-stream-snapshot-request": {
          const hostManager =
            appServerRegistry.getForHostIdOrThrowWhenDefaultHost(
              message.hostId,
            );
          if (hostManager == null) {
            logIgnoredStaleRemoteMessage(message.hostId, message.type);
            break;
          }
          hostManager.broadcastConversationSnapshot(message.conversationId);
          break;
        }
        case "thread-stream-resume-request": {
          // Handled by MessageHandlerAppServerHandlers.
          break;
        }
        case "thread-follower-start-turn-request": {
          const hostManager = appServerRegistry.getForHostIdOrThrow(
            message.hostId,
          );
          try {
            const result = await hostManager.handleThreadFollowerStartTurn(
              message.params,
            );
            messageBus.dispatchMessage("thread-follower-start-turn-response", {
              requestId: message.requestId,
              result,
            });
          } catch (error) {
            messageBus.dispatchMessage("thread-follower-start-turn-response", {
              requestId: message.requestId,
              error: String(error),
            });
          }
          break;
        }
        case "thread-follower-steer-turn-request": {
          const hostManager = appServerRegistry.getForHostIdOrThrow(
            message.hostId,
          );
          try {
            const result = await hostManager.handleThreadFollowerSteerTurn(
              message.params,
            );
            messageBus.dispatchMessage("thread-follower-steer-turn-response", {
              requestId: message.requestId,
              result,
            });
          } catch (error) {
            messageBus.dispatchMessage("thread-follower-steer-turn-response", {
              requestId: message.requestId,
              error: String(error),
            });
          }
          break;
        }
        case "thread-follower-interrupt-turn-request": {
          const hostManager = appServerRegistry.getForHostIdOrThrow(
            message.hostId,
          );
          try {
            const result = await hostManager.handleThreadFollowerInterruptTurn(
              message.params,
            );
            messageBus.dispatchMessage(
              "thread-follower-interrupt-turn-response",
              {
                requestId: message.requestId,
                result,
              },
            );
          } catch (error) {
            messageBus.dispatchMessage(
              "thread-follower-interrupt-turn-response",
              {
                requestId: message.requestId,
                error: String(error),
              },
            );
          }
          break;
        }
        case "thread-follower-set-model-and-reasoning-request": {
          const hostManager = appServerRegistry.getForHostIdOrThrow(
            message.hostId,
          );
          try {
            hostManager.assertThreadFollowerOwner(
              message.params.conversationId,
            );
            await setModelAndReasoningForNextTurn(
              hostManager,
              message.params.conversationId,
              message.params.model,
              message.params.reasoningEffort,
            );
            messageBus.dispatchMessage(
              "thread-follower-set-model-and-reasoning-response",
              {
                requestId: message.requestId,
                result: { ok: true },
              },
            );
          } catch (error) {
            messageBus.dispatchMessage(
              "thread-follower-set-model-and-reasoning-response",
              {
                requestId: message.requestId,
                error: String(error),
              },
            );
          }
          break;
        }
        case "thread-follower-set-collaboration-mode-request": {
          const hostManager = appServerRegistry.getForHostIdOrThrow(
            message.hostId,
          );
          try {
            const result =
              await hostManager.handleThreadFollowerSetCollaborationMode(
                message.params,
              );
            messageBus.dispatchMessage(
              "thread-follower-set-collaboration-mode-response",
              {
                requestId: message.requestId,
                result,
              },
            );
          } catch (error) {
            messageBus.dispatchMessage(
              "thread-follower-set-collaboration-mode-response",
              {
                requestId: message.requestId,
                error: String(error),
              },
            );
          }
          break;
        }
        case "thread-follower-edit-last-user-turn-request": {
          const hostManager = appServerRegistry.getForHostIdOrThrow(
            message.hostId,
          );
          try {
            const result =
              await hostManager.handleThreadFollowerEditLastUserTurn(
                message.params,
              );
            messageBus.dispatchMessage(
              "thread-follower-edit-last-user-turn-response",
              {
                requestId: message.requestId,
                result,
              },
            );
          } catch (error) {
            messageBus.dispatchMessage(
              "thread-follower-edit-last-user-turn-response",
              {
                requestId: message.requestId,
                error: String(error),
              },
            );
          }
          break;
        }
        case "thread-follower-command-approval-decision-request": {
          const hostManager = appServerRegistry.getForHostIdOrThrow(
            message.hostId,
          );
          try {
            const result =
              await hostManager.handleThreadFollowerCommandApprovalDecision(
                message.params,
              );
            messageBus.dispatchMessage(
              "thread-follower-command-approval-decision-response",
              {
                requestId: message.requestId,
                result,
              },
            );
          } catch (error) {
            messageBus.dispatchMessage(
              "thread-follower-command-approval-decision-response",
              {
                requestId: message.requestId,
                error: String(error),
              },
            );
          }
          break;
        }
        case "thread-follower-file-approval-decision-request": {
          const hostManager = appServerRegistry.getForHostIdOrThrow(
            message.hostId,
          );
          try {
            const result =
              await hostManager.handleThreadFollowerFileApprovalDecision(
                message.params,
              );
            messageBus.dispatchMessage(
              "thread-follower-file-approval-decision-response",
              {
                requestId: message.requestId,
                result,
              },
            );
          } catch (error) {
            messageBus.dispatchMessage(
              "thread-follower-file-approval-decision-response",
              {
                requestId: message.requestId,
                error: String(error),
              },
            );
          }
          break;
        }
        case "thread-follower-submit-user-input-request": {
          const hostManager = appServerRegistry.getForHostIdOrThrow(
            message.hostId,
          );
          try {
            const result =
              await hostManager.handleThreadFollowerSubmitUserInput(
                message.params,
              );
            messageBus.dispatchMessage(
              "thread-follower-submit-user-input-response",
              {
                requestId: message.requestId,
                result,
              },
            );
          } catch (error) {
            messageBus.dispatchMessage(
              "thread-follower-submit-user-input-response",
              {
                requestId: message.requestId,
                error: String(error),
              },
            );
          }
          break;
        }
        case "thread-follower-submit-mcp-server-elicitation-response-request": {
          const hostManager = appServerRegistry.getForHostIdOrThrow(
            message.hostId,
          );
          try {
            const result =
              await hostManager.handleThreadFollowerSubmitMcpServerElicitationResponse(
                message.params,
              );
            messageBus.dispatchMessage(
              "thread-follower-submit-mcp-server-elicitation-response-response",
              {
                requestId: message.requestId,
                result,
              },
            );
          } catch (error) {
            messageBus.dispatchMessage(
              "thread-follower-submit-mcp-server-elicitation-response-response",
              {
                requestId: message.requestId,
                error: String(error),
              },
            );
          }
          break;
        }
        case "thread-follower-set-queued-follow-ups-state-request": {
          const hostManager = appServerRegistry.getForHostIdOrThrow(
            message.hostId,
          );
          try {
            const result =
              await hostManager.handleThreadFollowerSetQueuedFollowUpsState(
                message.params,
                setQueuedFollowUpsState,
              );
            messageBus.dispatchMessage(
              "thread-follower-set-queued-follow-ups-state-response",
              {
                requestId: message.requestId,
                result,
              },
            );
          } catch (error) {
            messageBus.dispatchMessage(
              "thread-follower-set-queued-follow-ups-state-response",
              {
                requestId: message.requestId,
                error: String(error),
              },
            );
          }
          break;
        }
        case "thread-role-request": {
          const hostManager = appServerRegistry.getForHostIdOrThrow(
            message.hostId,
          );
          try {
            const role = hostManager.getThreadRole(message.conversationId);
            messageBus.dispatchMessage("thread-role-response", {
              requestId: message.requestId,
              role,
            });
          } catch (error) {
            messageBus.dispatchMessage("thread-role-response", {
              requestId: message.requestId,
              role: "follower",
              error: String(error),
            });
          }
          break;
        }
        case "open-create-remote-project-modal":
        case "remote-workspace-root-requested":
        case "codex-app-server-initialized":
        case "codex-app-server-connection-changed": {
          // Handled by workspace root dialog / app server manager hooks.
          break;
        }
      }
    };
    const handleMessage = (event: MessageEvent<unknown>): void => {
      const message = getTrustedMessageForView(event);
      if (message == null) {
        return;
      }
      try {
        void handleParsedMessage(message);
      } catch (error) {
        logger.error(`Invalid message received`, {
          safe: {},
          sensitive: { error: error },
        });
      }
    };
    window.addEventListener("message", handleMessage);
    return (): void => {
      window.removeEventListener("message", handleMessage);
    };
  }, [
    navigate,
    appServerRegistry,
    defaultAppServerManager,
    refetchIsCopilotApiAvailable,
    queryClient,
    setFatalError,
    setUseCopilotAuth,
    isCompactWindow,
    setQueuedFollowUpsState,
    claimAppConnectOAuthCallback,
  ]);

  return <>{children}</>;
}

function logIgnoredStaleRemoteMessage(
  hostId: string,
  messageType: MessageForView["type"],
): void {
  logger.warning("stale_remote_app_server_message_ignored", {
    safe: { hostId, messageType },
    sensitive: {},
  });
}
