import type * as AppServer from "app-server-types";
import { useAtomValue } from "jotai";
import last from "lodash/last";
import { useScope } from "maitai";
import {
  buildPermissionsConfigForMode,
  createConversationId,
  GlobalStateKey,
  maybeErrorToString,
  type ConversationId,
  type QueuedFollowUpMessage,
  type QueuedFollowUpState,
} from "protocol";
import { useEffect, useEffectEvent, useRef } from "react";

import {
  subscribeToRegistryManagers,
  useAppServerRegistry,
} from "@/app-server/app-server-manager-hooks";
import { maybeResumeConversation } from "@/app-server/requests/maybe-resume-conversation";
import { startTurn } from "@/app-server/requests/start-turn";
import {
  releaseStartTurnLock,
  tryAcquireStartTurnLock,
} from "@/app-server/start-turn-lock";
import { useGlobalState } from "@/hooks/use-global-state";
import { messageBus } from "@/message-bus";
import { productEventLogger$ } from "@/product-event-signal";
import type { ProductEventPayload } from "@/product-events";
import { renderComposerPrompt } from "@/prompts/render-prompt";
import { setQueuedFollowUpsCache } from "@/queued-follow-ups-cache";
import { AppScope } from "@/scopes/app-scope";
import { logger } from "@/utils/logger";
import { useFetchFromVSCode } from "@/vscode-api";

import { aAgentMode } from "./composer-atoms";
import { createImageLocalInputItem } from "./create-image-local-input-item";
import { dedupeFileDescriptors } from "./dedupe-file-descriptors";
import { buildImageFileAttachments } from "./image-file-attachments";

export function QueuedFollowUpRunner(): null {
  const appServerRegistry = useAppServerRegistry();
  const { data: queuedState, setData } = useGlobalState(
    GlobalStateKey.QUEUED_FOLLOW_UPS,
  );
  const { data: workspaceRoots } = useFetchFromVSCode("active-workspace-roots");
  const agentMode = useAtomValue(aAgentMode);
  const scope = useScope(AppScope);
  const logProductEventEvent = useEffectEvent(
    (payload: ProductEventPayload) => {
      scope.get(productEventLogger$).log(payload);
    },
  );
  const queuedStateRef = useRef<QueuedFollowUpState>({});
  const retryQueuedMessagesRunRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    const nextState = queuedState ?? {};
    queuedStateRef.current = nextState;
    setQueuedFollowUpsCache(nextState);
  }, [queuedState]);

  const conversationIds = Object.keys(queuedState ?? {}).map(
    createConversationId,
  );

  const updateQueueState = (
    updater: (prev: QueuedFollowUpState) => QueuedFollowUpState,
  ): void => {
    const next = updater(queuedStateRef.current ?? {});
    queuedStateRef.current = next;
    void setData(next);
  };

  const broadcastQueueIfOwner = (conversationId: ConversationId): void => {
    const manager = appServerRegistry.getForConversationId(conversationId);
    if (manager.getStreamRole(conversationId)?.role !== "owner") {
      return;
    }
    messageBus.dispatchMessage("thread-queued-followups-changed", {
      conversationId,
      messages: queuedStateRef.current[conversationId] ?? [],
    });
  };

  const isConversationInProgress = (
    conversationId: ConversationId,
  ): boolean => {
    const manager = appServerRegistry.getForConversationId(conversationId);
    const conversation = manager.getConversation(conversationId);
    if (!conversation) {
      return false;
    }
    const lastTurn = last(conversation.turns);
    if (!lastTurn) {
      return false;
    }
    return lastTurn.status === "inProgress";
  };

  const getWorkspaceRootsForMessage = (
    conversationId: ConversationId,
    message: QueuedFollowUpMessage,
  ): Array<string> => {
    const fromMessage = message.context.workspaceRoots;
    if (fromMessage && fromMessage.length > 0) {
      return fromMessage;
    }
    const manager = appServerRegistry.getForConversationId(conversationId);
    const conversation = manager.getConversation(conversationId);
    const cwd = conversation?.cwd ?? message.cwd;
    if (cwd) {
      return [cwd];
    }
    const activeRoots = workspaceRoots?.roots;
    if (activeRoots && activeRoots.length > 0) {
      return activeRoots;
    }
    return ["/"];
  };

  const markPaused = (
    conversationId: ConversationId,
    messageId: string,
    reason: string,
  ): void => {
    updateQueueState((prev) => {
      const queue = prev[conversationId] ?? [];
      const nextQueue = queue.map((item) =>
        item.id === messageId ? { ...item, pausedReason: reason } : item,
      );
      return { ...prev, [conversationId]: nextQueue };
    });
    broadcastQueueIfOwner(conversationId);
  };

  const removeFirstMessage = (
    conversationId: ConversationId,
    messageId: string,
  ): void => {
    updateQueueState((prev) => {
      const queue = prev[conversationId] ?? [];
      if (queue.length === 0 || queue[0]?.id !== messageId) {
        return prev;
      }
      const rest = queue.slice(1);
      if (rest.length === 0) {
        const { [conversationId]: _, ...next } = prev;
        return next;
      }
      return { ...prev, [conversationId]: rest };
    });
    broadcastQueueIfOwner(conversationId);
  };

  const shouldSkipSend = (
    conversationId: ConversationId,
    message: QueuedFollowUpMessage,
  ): boolean => {
    if (message.pausedReason) {
      return true;
    }
    const manager = appServerRegistry.getForConversationId(conversationId);
    if (manager.getStreamRole(conversationId)?.role === "follower") {
      return true;
    }
    return isConversationInProgress(conversationId);
  };

  const sendQueuedMessage = useEffectEvent(
    async (conversationId: ConversationId): Promise<void> => {
      if (!tryAcquireStartTurnLock(conversationId)) {
        return;
      }
      const queue = queuedStateRef.current[conversationId] ?? [];
      const nextMessage = queue[0];
      if (!nextMessage) {
        releaseStartTurnLock(conversationId);
        return;
      }
      if (shouldSkipSend(conversationId, nextMessage)) {
        releaseStartTurnLock(conversationId);
        return;
      }
      try {
        const workspaceRootList = getWorkspaceRootsForMessage(
          conversationId,
          nextMessage,
        );
        const manager = appServerRegistry.getForConversationId(conversationId);
        if (manager.needsResume(conversationId)) {
          await maybeResumeConversation(manager, {
            conversationId,
            model: null,
            reasoningEffort: null,
            workspaceRoots: workspaceRootList,
            collaborationMode: null,
          });
        }
        if (shouldSkipSend(conversationId, nextMessage)) {
          return;
        }

        const config = await manager.getUserSavedConfiguration(nextMessage.cwd);
        const permissions = buildPermissionsConfigForMode(
          agentMode,
          workspaceRootList,
          config,
        );
        const imageFileAttachments = buildImageFileAttachments(
          nextMessage.context.imageAttachments,
        );
        const attachments = dedupeFileDescriptors([
          ...nextMessage.context.fileAttachments,
          ...nextMessage.context.addedFiles,
          ...imageFileAttachments,
        ]);
        const input: Array<AppServer.v2.UserInput> = [
          {
            type: "text",
            text: renderComposerPrompt(nextMessage.context),
            text_elements: [],
          },
          ...nextMessage.context.imageAttachments.map((img) =>
            createImageLocalInputItem(img.src, img.localPath),
          ),
        ];

        await startTurn(manager, conversationId, {
          input,
          cwd: nextMessage.cwd,
          approvalPolicy: permissions.approvalPolicy,
          approvalsReviewer: permissions.approvalsReviewer,
          sandboxPolicy: permissions.sandboxPolicy,
          attachments,
          // We should assume the thread collaborationMode, mode and effort.
          model: null,
          effort: null,
          collaborationMode: null,
        });

        removeFirstMessage(conversationId, nextMessage.id);
      } catch (error) {
        const reason = maybeErrorToString(error);
        logger.error(`[queued-followups] Failed to send queued follow-up for`, {
          safe: {},
          sensitive: {
            conversationId: conversationId,
            reason: reason,
          },
        });
        markPaused(conversationId, nextMessage.id, reason);
      } finally {
        releaseStartTurnLock(conversationId);
      }
    },
  );

  const retryQueuedMessages = useEffectEvent((): void => {
    retryQueuedMessagesRunRef.current = retryQueuedMessagesRunRef.current.then(
      () =>
        Object.keys(queuedStateRef.current)
          .map(createConversationId)
          .reduce(
            (promise, conversationId) =>
              promise.then(() => sendQueuedMessage(conversationId)),
            Promise.resolve(),
          ),
    );
  });

  useEffect(() => {
    if (conversationIds.length === 0) {
      return;
    }
    retryQueuedMessages();
  }, [conversationIds]);

  const handleTurnCompleted = useEffectEvent(
    (evt: {
      conversationId: ConversationId;
      turnId: string | null;
      lastAgentMessage: string | null;
      restoredQueuedFollowUps: Array<QueuedFollowUpMessage>;
    }): void => {
      logProductEventEvent({ eventName: "codex_turn_completed" });
      if (evt.restoredQueuedFollowUps.length > 0) {
        updateQueueState((prev) => {
          const queue = prev[evt.conversationId] ?? [];
          return {
            ...prev,
            [evt.conversationId]: [...evt.restoredQueuedFollowUps, ...queue],
          };
        });
        broadcastQueueIfOwner(evt.conversationId);
      }
      void sendQueuedMessage(evt.conversationId);
    },
  );

  useEffect(() => {
    return subscribeToRegistryManagers({
      appServerRegistry,
      onStoreChange: retryQueuedMessages,
      subscribeToManager: (manager, retryQueuedMessagesForManager) => {
        const unsubscribeTurnCompleted =
          manager.addTurnCompletedListener(handleTurnCompleted);
        const unsubscribeConversationMeta =
          manager.addAnyConversationMetaCallback(() => {
            retryQueuedMessagesForManager();
          });
        return (): void => {
          unsubscribeTurnCompleted();
          unsubscribeConversationMeta();
        };
      },
    });
  }, [appServerRegistry]);

  return null;
}
