import type { ConversationId } from "protocol";

import { useAppServerManagerForConversationIdOrDefault } from "@/app-server/app-server-manager-hooks";
import { maybeResumeConversation } from "@/app-server/requests/maybe-resume-conversation";
import { useWindowType } from "@/hooks/use-window-type";
import { messageBus } from "@/message-bus";
import { useGate } from "@/statsig/statsig";
import { logger } from "@/utils/logger";

export function useThreadOverlayAction({
  conversationId,
}: {
  conversationId: ConversationId | null;
}): {
  canOpenThreadOverlay: boolean;
  openThreadOverlay: () => void;
} {
  const windowType = useWindowType();
  const appServerManager =
    useAppServerManagerForConversationIdOrDefault(conversationId);
  const threadOverlayEnabled = useGate(__statsigName("codex-app-mini-window"));
  const multiWindowEnabled = useGate(
    __statsigName("codex_rollout_multi_window"),
  );
  const canOpenThreadOverlay =
    windowType === "electron" &&
    threadOverlayEnabled &&
    multiWindowEnabled &&
    conversationId != null;

  const openThreadOverlay = (): void => {
    if (!canOpenThreadOverlay || conversationId == null) {
      return;
    }
    messageBus.dispatchMessage("open-thread-overlay", {
      conversationId,
    });
    const conversation = appServerManager.getConversation(conversationId);
    if (
      !appServerManager.needsResume(conversationId) ||
      conversation?.resumeState === "resuming"
    ) {
      return;
    }
    void maybeResumeConversation(appServerManager, {
      conversationId,
      model: null,
      reasoningEffort: null,
      workspaceRoots: [
        appServerManager.getConversationCwd(conversationId) ?? "/",
      ],
      collaborationMode: conversation?.latestCollaborationMode ?? null,
    })
      .then(() => {
        appServerManager.broadcastConversationSnapshot(conversationId);
      })
      .catch((error) => {
        const nextConversation =
          appServerManager.getConversation(conversationId);
        if (
          appServerManager.needsResume(conversationId) &&
          nextConversation?.resumeState === "resuming"
        ) {
          appServerManager.updateConversationState(conversationId, (draft) => {
            if (draft.resumeState === "resuming") {
              draft.resumeState = "needs_resume";
            }
          });
        }
        logger.warning("thread_overlay_snapshot_seed_failed", {
          safe: {
            conversationId,
            hostId: appServerManager.getHostId(),
          },
          sensitive: { error },
        });
      });
  };

  return {
    canOpenThreadOverlay,
    openThreadOverlay,
  };
}

export function useOpenThreadOverlay({
  conversationId,
}: {
  conversationId: ConversationId | null;
}): () => void {
  return useThreadOverlayAction({ conversationId }).openThreadOverlay;
}
