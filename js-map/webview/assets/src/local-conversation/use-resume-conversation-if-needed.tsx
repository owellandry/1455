import { useScope } from "maitai";
import { maybeErrorToString, type ConversationId } from "protocol";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import { useIntl, type IntlShape } from "react-intl";

import {
  subscribeToRegistryManagers,
  useAppServerRegistry,
} from "@/app-server/app-server-manager-hooks";
import { maybeResumeConversation } from "@/app-server/requests/maybe-resume-conversation";
import { getSubagentSourceMetadata } from "@/app-server/utils/get-subagent-source-metadata";
import { toast$ } from "@/components/toaster/toast-signal";
import { useCollaborationMode } from "@/composer/use-collaboration-mode";
import { messageBus } from "@/message-bus";
import { AppScope } from "@/scopes/app-scope";
import { logger } from "@/utils/logger";
import {
  APP_SERVER_RPC_ERROR_REASON_CLOUD_REQUIREMENTS,
  getAppServerRpcErrorReason,
} from "@/utils/maybe-error-to-string";
import { useFetchFromVSCode } from "@/vscode-api";

export function useResumeConversationIfNeeded(
  conversationId: ConversationId | null,
): {
  isResuming: boolean;
} {
  const appServerRegistry = useAppServerRegistry();
  const subscribeToManagerLookup = useCallback(
    (onStoreChange: () => void): (() => void) => {
      if (conversationId == null) {
        return () => {};
      }
      return subscribeToRegistryManagers({
        appServerRegistry,
        onStoreChange,
        subscribeToManager: (manager, notify) => {
          const unsubscribeConversation =
            manager.addAnyConversationCallback(notify);
          const unsubscribeConversationMeta =
            manager.addAnyConversationMetaCallback(notify);
          return (): void => {
            unsubscribeConversation();
            unsubscribeConversationMeta();
          };
        },
      });
    },
    [appServerRegistry, conversationId],
  );
  const mcpManager = useSyncExternalStore(subscribeToManagerLookup, () =>
    conversationId == null
      ? null
      : appServerRegistry.getMaybeForConversationId(conversationId),
  );
  const intl = useIntl();
  const scope = useScope(AppScope);
  const { activeMode: activeCollaborationMode } =
    useCollaborationMode(conversationId);
  const { data: workspaceRoots, isLoading: isWorkspaceRootsLoading } =
    useFetchFromVSCode("active-workspace-roots");
  const roots = workspaceRoots?.roots;
  const needsResume = useSyncExternalStore(
    (onStoreChange): (() => void) => {
      if (conversationId == null || mcpManager == null) {
        return () => {};
      }
      return mcpManager.addConversationCallback(conversationId, () => {
        onStoreChange();
      });
    },
    () => {
      if (conversationId == null || mcpManager == null) {
        return false;
      }

      return mcpManager.needsResume(conversationId);
    },
  );
  const [isResuming, setIsResuming] = useState(needsResume);
  const inFlightConversationRef = useRef<ConversationId | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasShownResumeErrorRef = useRef(false);
  const [resumeRetryNonce, setResumeRetryNonce] = useState(0);
  if (!needsResume) {
    inFlightConversationRef.current = null;
    hasShownResumeErrorRef.current = false;
    if (retryTimeoutRef.current != null) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }

  const resumeConversation = useEffectEvent(
    async (conversationId: ConversationId) => {
      if (mcpManager == null) {
        return;
      }
      try {
        setIsResuming(true);
        inFlightConversationRef.current = conversationId;
        await maybeResumeConversation(mcpManager, {
          conversationId,
          model: null,
          reasoningEffort: null,
          workspaceRoots: roots ? roots : ["/"],
          collaborationMode: activeCollaborationMode,
        });
      } catch (error) {
        logger.error(`Failed to resume conversation`, {
          safe: {},
          sensitive: {
            conversationId: conversationId,
            error: error,
          },
        });
        if (inFlightConversationRef.current !== conversationId) {
          return;
        }
        if (
          mcpManager.getConversation(conversationId) == null ||
          mcpManager.isConversationArchiving(conversationId) ||
          !mcpManager.needsResume(conversationId)
        ) {
          inFlightConversationRef.current = null;
          hasShownResumeErrorRef.current = false;
          return;
        }
        const isSubagentChildThread =
          getSubagentSourceMetadata(
            mcpManager.getConversation(conversationId)?.source,
          )?.parentThreadId != null;
        if (!isSubagentChildThread && !hasShownResumeErrorRef.current) {
          scope
            .get(toast$)
            .danger(formatResumeConversationErrorMessage(intl, error), {
              id: `resume-task-error-${conversationId}`,
            });
          hasShownResumeErrorRef.current = true;
        }
        if (retryTimeoutRef.current == null) {
          retryTimeoutRef.current = setTimeout(() => {
            retryTimeoutRef.current = null;
            setResumeRetryNonce((value) => value + 1);
          }, 750);
        }
        inFlightConversationRef.current = null;
      } finally {
        setIsResuming(false);
      }
    },
  );

  useEffect(() => {
    if (conversationId == null || mcpManager == null) {
      return;
    }
    if (
      getSubagentSourceMetadata(
        mcpManager.getConversation(conversationId)?.source,
      )?.parentThreadId == null
    ) {
      return;
    }

    messageBus.dispatchMessage("subagent-thread-opened", {
      hostId: mcpManager.getHostId(),
      conversationId,
    });
  }, [conversationId, mcpManager]);

  useEffect(() => {
    if (
      conversationId &&
      mcpManager != null &&
      needsResume &&
      conversationId !== inFlightConversationRef.current &&
      !isWorkspaceRootsLoading
    ) {
      void resumeConversation(conversationId);
    }
  }, [
    mcpManager,
    needsResume,
    conversationId,
    inFlightConversationRef,
    isWorkspaceRootsLoading,
    resumeRetryNonce,
  ]);

  useEffect(() => {
    return (): void => {
      if (retryTimeoutRef.current != null) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);

  return { isResuming };
}

export function formatResumeConversationErrorMessage(
  intl: IntlShape,
  error: unknown,
): ReactNode {
  if (
    getAppServerRpcErrorReason(error) ===
    APP_SERVER_RPC_ERROR_REASON_CLOUD_REQUIREMENTS
  ) {
    return intl.formatMessage({
      id: "localTaskRow.resumeError.cloudRequirements",
      defaultMessage:
        "Failed to resume thread. Please log out and sign in again",
      description:
        "Error shown when resuming a local Codex task fails because cloud requirements could not be loaded",
    });
  }

  return intl.formatMessage(
    {
      id: "localTaskRow.resumeError.v2",
      defaultMessage: "Failed to resume thread{br}{error}",
      description: "Error shown when resuming a local Codex task fails",
    },
    {
      br: <br />,
      error: maybeErrorToString(error),
    },
  );
}
